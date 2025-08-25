const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json({ message: 'Billing routes working', billing: [] });
});

module.exports = router;