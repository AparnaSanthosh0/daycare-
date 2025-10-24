// Lightweight client-side recommender utilities
// Combines simple content similarity (name/desc/category) with user signals (views/cart/wishlist)

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 64);
}

function vectorizeProduct(p) {
  const tokens = [
    // category is strong signal
    ...(p.category ? [String(p.category).toLowerCase(), String(p.category).toLowerCase()] : []),
    ...tokenize(p.name),
    ...tokenize(p.description)
  ];
  const vec = new Map();
  for (const t of tokens) vec.set(t, (vec.get(t) || 0) + 1);
  return vec;
}

function cosineSim(vecA, vecB) {
  if (!vecA || !vecB) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [, v] of vecA) normA += v * v;
  for (const [, v] of vecB) normB += v * v;
  const smaller = vecA.size < vecB.size ? vecA : vecB;
  const larger = vecA.size < vecB.size ? vecB : vecA;
  for (const [k, v] of smaller) {
    const w = larger.get(k);
    if (w) dot += v * w;
  }
  if (!normA || !normB) return 0;
  return dot / Math.sqrt(normA * normB);
}

function priceAffinity(pA, pB) {
  const a = Number(pA?.price) || 0;
  const b = Number(pB?.price) || 0;
  if (!a || !b) return 0.1;
  const diff = Math.abs(a - b);
  const rel = diff / Math.max(300, Math.max(a, b));
  return Math.max(0, 1 - rel); // 1 if similar, down to ~0 when far
}

// Normalize raw products from list into a compact shape used by UI
function normalizeProduct(p) {
  if (!p) return null;
  return {
    id: p._id || p.id,
    name: p.name,
    price: p.price,
    originalPrice: p.originalPrice || null,
    image: p.image || (Array.isArray(p.images) && p.images[0]) || null,
    category: p.category || 'General',
    description: p.description || '',
    inStock: p.inStock !== false,
  };
}

// Recommend given a current product
export function recommendForProduct(currentProduct, allProducts, options = {}) {
  const k = options.k ?? 10;
  const current = normalizeProduct(currentProduct);
  const pool = (allProducts || []).map(normalizeProduct).filter(Boolean).filter(p => p.id !== current?.id);
  const vecCurrent = vectorizeProduct(current || {});
  const scored = pool.map(p => {
    const sContent = cosineSim(vecCurrent, vectorizeProduct(p));
    const sPrice = priceAffinity(current, p);
    const score = 0.75 * sContent + 0.25 * sPrice;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map(x => x.p);
}

// Recommend personalized list using interactions and wishlist/cart/recentlyViewed
export function recommendForUser({ interactions = {}, wishlistIds = [], cartIds = [], recentlyViewedIds = [] }, allProducts, options = {}) {
  const k = options.k ?? 12;
  const pool = (allProducts || []).map(normalizeProduct).filter(Boolean);

  // Build a pseudo-profile vector from items the user interacted with
  const interestIds = new Set([...wishlistIds, ...cartIds, ...recentlyViewedIds.slice(0, 10)]);
  const anchors = pool.filter(p => interestIds.has(p.id));
  const anchorVec = new Map();
  for (const a of anchors) {
    const weight = 1 + (interactions[a.id]?.add || 0) + (interactions[a.id]?.view ? Math.min(2, interactions[a.id].view / 3) : 0) + (wishlistIds.includes(a.id) ? 2 : 0);
    for (const [kTok, vTok] of vectorizeProduct(a)) {
      anchorVec.set(kTok, (anchorVec.get(kTok) || 0) + vTok * weight);
    }
  }

  const wishSet = new Set(wishlistIds);
  const cartSet = new Set(cartIds);
  const recents = new Set(recentlyViewedIds);

  const scored = pool.map(p => {
    const sContent = cosineSim(anchorVec, vectorizeProduct(p));
    const sPop = (interactions[p.id]?.view || 0) * 0.02 + (interactions[p.id]?.add || 0) * 0.1 + (wishSet.has(p.id) ? 0.2 : 0);
    const sBoost = (recents.has(p.id) ? -0.2 : 0) + (cartSet.has(p.id) ? -0.5 : 0); // avoid what they already have/just saw
    const score = 0.85 * sContent + 0.15 * sPop + sBoost;
    return { p, score };
  });

  // Deprioritize out-of-stock
  scored.sort((a, b) => {
    const sa = (a.p.inStock ? 0 : -1e3) + a.score;
    const sb = (b.p.inStock ? 0 : -1e3) + b.score;
    return sb - sa;
  });

  // Remove items already in cart
  const result = [];
  for (const x of scored) {
    if (cartSet.has(x.p.id)) continue;
    if (!x.p.inStock) continue;
    result.push(x.p);
    if (result.length >= k) break;
  }
  return result;
}

export function collectSignalsFromContext(ctx) {
  const wishlistIds = Array.from(ctx?.wishlist || []).map(x => x);
  const cartIds = Array.from(ctx?.cartItems || []).map(ci => ci.id);
  const interactions = ctx?.interactions || {};
  const recentlyViewedIds = ctx?.recentlyViewed || [];
  return { interactions, wishlistIds, cartIds, recentlyViewedIds };
}
