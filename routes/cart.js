// This file is a placeholder — cart is managed client-side in React context
// For server-side cart (optional), implement as needed
const express = require('express');
const router = express.Router();
router.get('/ping', (req, res) => res.json({ message: 'Cart is managed client-side' }));
module.exports = router;
