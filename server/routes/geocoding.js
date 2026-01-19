const router = require('express').Router();

// Geocode address using Nominatim (OpenStreetMap)
router.get('/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address parameter is required' });
    }

    // Use dynamic import for node-fetch (ESM module)
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
      {
        headers: {
          'User-Agent': 'TinyTots Daycare App/1.0'
        }
      }
    );

    const data = await response.json();

    if (data && data.length > 0) {
      res.json({
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
      });
    } else {
      res.status(404).json({ error: 'Location not found' });
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Failed to geocode address' });
  }
});

module.exports = router;
