import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const ShopContext = createContext(null);

export const ShopProvider = ({ children }) => {
  const location = useLocation();
  const [cartItems, setCartItems] = useState([]); // {id, name, price, quantity, image, variant}
  const [wishlist, setWishlist] = useState(new Set());
  const [interactions, setInteractions] = useState({}); // { [productId]: { view: number, add: number } }
  const [recentlyViewed, setRecentlyViewed] = useState([]); // [productId]

  // Hydrate from localStorage once
  React.useEffect(() => {
    try {
      const rawCart = localStorage.getItem('shop_cart');
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (Array.isArray(parsed)) setCartItems(parsed);
      }
      const rawWish = localStorage.getItem('shop_wishlist');
      if (rawWish) {
        const arr = JSON.parse(rawWish);
        if (Array.isArray(arr)) setWishlist(new Set(arr));
      }
      const rawInt = localStorage.getItem('shop_interactions');
      if (rawInt) {
        const obj = JSON.parse(rawInt);
        if (obj && typeof obj === 'object') setInteractions(obj);
      }
      const rawViewed = localStorage.getItem('shop_recentlyViewed');
      if (rawViewed) {
        const arr = JSON.parse(rawViewed);
        if (Array.isArray(arr)) setRecentlyViewed(arr);
      }
    } catch {}
  }, []);

  // Persist on changes (debounced by React batching)
  React.useEffect(() => {
    try { localStorage.setItem('shop_cart', JSON.stringify(cartItems)); } catch {}
  }, [cartItems]);
  React.useEffect(() => {
    try { localStorage.setItem('shop_wishlist', JSON.stringify(Array.from(wishlist))); } catch {}
  }, [wishlist]);
  React.useEffect(() => {
    try { localStorage.setItem('shop_interactions', JSON.stringify(interactions)); } catch {}
  }, [interactions]);
  React.useEffect(() => {
    try { localStorage.setItem('shop_recentlyViewed', JSON.stringify(recentlyViewed)); } catch {}
  }, [recentlyViewed]);

  const addToCart = useCallback((product, variant = null, qty = 1) => {
    // Prefer explicit stock quantity when provided; otherwise:
    // - if inStock is explicitly false, treat as 0
    // - if no stock info at all (e.g. AR try-on demo objects), assume effectively infinite stock
    const hasNumericStock = typeof product.stockQty === 'number' && !Number.isNaN(product.stockQty);
    const stockQty = hasNumericStock
      ? product.stockQty
      : (product.inStock === false ? 0 : Infinity);

    // Normalise product id so AR / demo objects with only _id still work
    const productId = product.id ?? product._id;

    if (!productId) {
      console.warn('Cannot add to cart: product is missing id/_id', product);
      return false;
    }

    // Check if product is out of stock
    if (stockQty <= 0) {
      console.warn(`Cannot add ${product.name} to cart: out of stock`);
      return false; // Return false to indicate failure
    }

    // Extract optional customization payload (from 2D outfit builder)
    const customization = product.customization || null;
    // A customised item generates a unique key so it's tracked separately
    const custKey = customization
      ? `::custom::${JSON.stringify({
          si: customization.silhouette,
          ne: customization.neckline,
          sl: customization.sleeve,
          le: customization.length,
          wa: customization.waist,
          fe: customization.features?.sort().join(','),
          bc: customization.baseColour,
          pt: customization.pattern,
          tx: customization.text,
          tc: customization.textColour,
          ff: customization.fontFamily,
        })}`
      : '';

    setCartItems((prev) => {
      const key = `${productId}${variant ? `::${variant}` : ''}${custKey}`;
      const idx = prev.findIndex((i) => i.key === key);
      
      if (idx !== -1) {
        const next = [...prev];
        const current = next[idx];
        const currentStock = typeof current.stockQty === 'number' && !Number.isNaN(current.stockQty)
          ? current.stockQty
          : stockQty;
        const newQuantity = current.quantity + qty;
        // Check if new quantity exceeds available stock (unless effectively infinite)
        if (Number.isFinite(currentStock) && newQuantity > currentStock) {
          console.warn(`Cannot add ${qty} more of ${product.name}: insufficient stock`);
          return prev; // Don't update if stock insufficient
        }
        next[idx] = { ...current, quantity: newQuantity, stockQty: currentStock };
        return next;
      }
      
      // Check if requested quantity exceeds available stock (unless effectively infinite)
      if (Number.isFinite(stockQty) && qty > stockQty) {
        console.warn(`Cannot add ${qty} of ${product.name}: only ${stockQty} available`);
        return prev;
      }
      
      return [
        ...prev,
        {
          key,
          id: productId,
          name: product.name,
          price: product.price,
          // Show the canvas-generated preview for customised items
          image: customization?.previewDataUrl || product.image,
          quantity: qty,
          variant,
          stockQty: stockQty, // Store stock quantity for later checks
          customization,      // Persist full customisation data
        },
      ];
    });
    // record add interaction
    setInteractions((prev) => {
      const next = { ...prev };
      const idForStats = product.id ?? product._id;
      if (!idForStats) return next;
      const entry = next[idForStats] || { view: 0, add: 0 };
      next[idForStats] = { ...entry, add: entry.add + 1 };
      return next;
    });
    return true; // Return true to indicate success
  }, []);

  const removeFromCart = useCallback((key) => {
    setCartItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQuantity = useCallback((key, quantity) => {
    setCartItems((prev) => {
      return prev.map((i) => {
        if (i.key === key) {
          const newQty = Math.max(0, quantity);
          // Check if new quantity exceeds available stock
          if (i.stockQty !== undefined && newQty > i.stockQty) {
            // Limit to available stock
            return { ...i, quantity: i.stockQty };
          }
          return { ...i, quantity: newQty };
        }
        return i;
      }).filter((i) => i.quantity > 0);
    });
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const toggleWishlist = useCallback((productId) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  // Interaction helpers
  const recordView = useCallback((productId) => {
    if (!productId) return;
    setInteractions((prev) => {
      const next = { ...prev };
      const entry = next[productId] || { view: 0, add: 0 };
      next[productId] = { ...entry, view: entry.view + 1 };
      return next;
    });
  }, []);

  const pushRecentlyViewed = useCallback((productId) => {
    if (!productId) return;
    setRecentlyViewed((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)];
      return next.slice(0, 15);
    });
  }, []);

  const cartCount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);
  const cartSubtotal = useMemo(() => cartItems.reduce((s, i) => s + i.price * i.quantity, 0), [cartItems]);
  
  // Determine if we're in ecommerce context based on current route
  const isEcommerceContext = useMemo(() => {
    const ecommerceRoutes = ['/shop', '/cart', '/shortlist', '/track-order', '/customer-login', '/customer-register'];
    return ecommerceRoutes.some(route => location.pathname.startsWith(route));
  }, [location.pathname]);

  const value = useMemo(() => ({
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    wishlist,
    toggleWishlist,
    cartCount,
    cartSubtotal,
    interactions,
    recentlyViewed,
    recordView,
    pushRecentlyViewed,
    isEcommerceContext,
  }), [cartItems, addToCart, removeFromCart, updateQuantity, clearCart, wishlist, toggleWishlist, cartCount, cartSubtotal, interactions, recentlyViewed, recordView, pushRecentlyViewed, isEcommerceContext]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export const useShop = () => {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
};
