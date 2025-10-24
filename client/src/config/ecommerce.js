// Ecommerce Configuration
export const ecommerceConfig = {
  // Main ecommerce site URL
  url: process.env.REACT_APP_ECOMMERCE_URL || '/shop',
  
  // Button text configurations
  buttonText: {
    desktop: 'Shop Now',
    mobile: 'Shop'
  },
  
  // UI positioning
  position: 'left', // 'left' for features section, 'right' for user section
  
  // Feature flags
  enabled: process.env.REACT_APP_ECOMMERCE_ENABLED !== 'false', // Default to true
  
  // Analytics tracking (optional)
  trackClicks: process.env.REACT_APP_TRACK_ECOMMERCE_CLICKS === 'true',
  
  // Additional settings
  openInNewTab: false, // Changed to false for internal route
  showIcon: true,
  
  // Categories or specific product links (optional)
  categories: {
    toys: '/toys',
    books: '/books',
    supplies: '/supplies',
    clothing: '/clothing'
  }
};

// Helper function to get full URL for specific category
export const getEcommerceUrl = (category = '') => {
  const baseUrl = ecommerceConfig.url;
  if (category && ecommerceConfig.categories[category]) {
    return `${baseUrl}${ecommerceConfig.categories[category]}`;
  }
  return baseUrl;
};

// Helper function to track ecommerce clicks (for analytics)
export const trackEcommerceClick = (category = 'general') => {
  if (ecommerceConfig.trackClicks && window.gtag) {
    window.gtag('event', 'ecommerce_click', {
      event_category: 'ecommerce',
      event_label: category,
      value: 1
    });
  }
};

// Helper function to handle ecommerce navigation
export const handleEcommerceNavigation = (navigate, category = '') => {
  trackEcommerceClick(category);
  const url = getEcommerceUrl();
  
  // Check if it's an internal route (starts with /)
  if (url.startsWith('/')) {
    const from = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : undefined;
    navigate(url, { state: from ? { from } : undefined });
  } else {
    // External URL
    if (ecommerceConfig.openInNewTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }
};

export default ecommerceConfig;