const express = require('express');
const router = express.Router();
const {
  submitQuote, getMyQuotes, getAllQuotes, updateQuote
} = require('../controllers/quoteController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', submitQuote);
router.get('/my-quotes', protect, getMyQuotes);
router.get('/admin/all', protect, adminOnly, getAllQuotes);
router.put('/admin/:id', protect, adminOnly, updateQuote);

module.exports = router;
