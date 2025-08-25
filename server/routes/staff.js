const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json({ message: 'Staff routes working', staff: [] });
});

module.exports = router;