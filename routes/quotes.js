const express = require('express');
const router = express.Router();
const {
  submitQuote, getPublicQuote, respondToQuote,
  getMyQuotes, getAllQuotes, updateQuote,
} = require('../controllers/quoteController');
const { protect, adminOnly } = require('../middleware/auth');

// Public (customer proves access with the emailed token or their email address)
router.post('/', submitQuote);
router.get('/public/:quoteNumber', getPublicQuote);
router.post('/public/:quoteNumber/respond', respondToQuote);

// Logged-in customer
router.get('/my-quotes', protect, getMyQuotes);

// Admin
router.get('/admin/all', protect, adminOnly, getAllQuotes);
router.put('/admin/:id', protect, adminOnly, updateQuote);

module.exports = router;
