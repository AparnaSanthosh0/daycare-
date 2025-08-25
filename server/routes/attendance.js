const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  res.json({ message: 'Attendance routes working', attendance: [] });
});

module.exports = router;