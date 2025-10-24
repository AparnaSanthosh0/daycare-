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
    setCartItems((prev) => {
      const key = `${product.id}${variant ? `::${variant}` : ''}`;
      const idx = prev.findIndex((i) => i.key === key);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [
        ...prev,
        {
          key,
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: qty,
          variant,
        },
      ];
    });
    // record add interaction
    setInteractions((prev) => {
      const next = { ...prev };
      const entry = next[product.id] || { view: 0, add: 0 };
      next[product.id] = { ...entry, add: entry.add + 1 };
      return next;
    });
  }, []);

  const removeFromCart = useCallback((key) => {
    setCartItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQuantity = useCallback((key, quantity) => {
    setCartItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(0, quantity) } : i)).filter((i) => i.quantity > 0));
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
