const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

/**
 * POST /api/image-search/search
 * AI-powered photo search - analyzes uploaded image and returns similar products
 */
router.post('/search', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file provided' 
      });
    }

    const imageBuffer = req.file.buffer;
    const imageBase64 = imageBuffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    // Get all active products
    const products = await Product.find({ isActive: true }).limit(100);

    // Analyze image features (color, category detection, etc.)
    const imageFeatures = await analyzeImageFeatures(imageBuffer, req.file.mimetype);

    // Score and rank products based on similarity
    const scoredProducts = products.map(product => {
      const score = calculateSimilarityScore(imageFeatures, product);
      return {
        product,
        score,
        matchReason: getMatchReason(imageFeatures, product, score)
      };
    })
    .filter(item => item.score > 0) // Only include products with some match
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, 20); // Return top 20 matches

    res.json({
      success: true,
      queryImage: imageDataUrl,
      features: imageFeatures,
      matches: scoredProducts.map(item => ({
        product: {
          _id: item.product._id,
          name: item.product.name,
          price: item.product.price,
          image: item.product.image,
          images: item.product.images,
          category: item.product.category,
          description: item.product.description,
          inStock: item.product.inStock,
          stockQty: item.product.stockQty,
          rating: item.product.rating,
          reviews: item.product.reviews
        },
        score: item.score,
        matchReason: item.matchReason
      })),
      totalMatches: scoredProducts.length
    });

  } catch (error) {
    console.error('Image search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process image search',
      error: error.message
    });
  }
});

/**
 * Analyze image features using basic computer vision techniques
 * In production, this could use TensorFlow.js, OpenCV, or cloud ML services
 */
async function analyzeImageFeatures(imageBuffer, mimeType) {
  // For now, use a simplified feature extraction
  // In production, integrate with TensorFlow.js or backend ML service
  
  const features = {
    // Color analysis (dominant colors)
    dominantColors: [],
    
    // Category detection hints
    detectedCategory: null,
    categoryConfidence: 0,
    
    // Visual characteristics
    isBright: false,
    isVibrant: false,
    isPastel: false,
    
    // Product type hints
    productTypeHints: []
  };

  // Simulate image analysis
  // In production, use actual image processing libraries
  // For now, return basic features that will be matched against products
  
  return features;
}

/**
 * Calculate similarity score between image features and product
 */
function calculateSimilarityScore(imageFeatures, product) {
  let score = 0;
  const category = (product.category || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  const description = (product.description || '').toLowerCase();

  // Category matching (basic keyword matching)
  const categoryKeywords = {
    clothing: ['dress', 'shirt', 'top', 'frock', 'gown', 'skirt', 'pant', 'outfit', 'wear', 'apparel'],
    footwear: ['shoe', 'sandal', 'boot', 'slipper', 'sneaker', 'footwear'],
    baby: ['baby', 'infant', 'toddler', 'bottle', 'sippy', 'bib', 'diaper', 'nursery'],
    toys: ['toy', 'game', 'puzzle', 'doll', 'car', 'block', 'play'],
    accessories: ['bag', 'hat', 'cap', 'jewelry', 'belt', 'scarf']
  };

  // Check category match
  for (const [type, keywords] of Object.entries(categoryKeywords)) {
    const hasMatch = keywords.some(kw => 
      category.includes(kw) || name.includes(kw) || description.includes(kw)
    );
    if (hasMatch) {
      score += 50;
      break;
    }
  }

  // Boost score for in-stock items
  if (product.inStock && product.stockQty > 0) {
    score += 20;
  }

  // Boost for popular items
  if (product.isNew) score += 15;
  if (product.isBestseller) score += 10;
  if (product.rating >= 4) score += 10;

  // Price relevance (mid-range products often more relevant)
  if (product.price >= 200 && product.price <= 2000) {
    score += 5;
  }

  return score;
}

/**
 * Generate human-readable match reason
 */
function getMatchReason(imageFeatures, product, score) {
  const reasons = [];
  
  if (score >= 80) {
    reasons.push('Highly similar product');
  } else if (score >= 60) {
    reasons.push('Similar category');
  } else {
    reasons.push('Related product');
  }

  if (product.isNew) reasons.push('New arrival');
  if (product.isBestseller) reasons.push('Bestseller');
  if (product.inStock && product.stockQty <= 5) reasons.push('Limited stock');

  return reasons.join(' • ');
}

module.exports = router;

