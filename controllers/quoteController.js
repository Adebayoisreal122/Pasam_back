const Quote = require('../models/Quote');
const { sendEmail } = require('../utils/email');

exports.submitQuote = async (req, res) => {
  try {
    const quote = await Quote.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Quote request submitted. We will contact you within 24 hours.',
      quote: { quoteNumber: quote.quoteNumber, _id: quote._id }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyQuotes = async (req, res) => {
  try {
    const quotes = await Quote.find({ email: req.user.email }).sort('-createdAt');
    res.json({ success: true, quotes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllQuotes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Quote.countDocuments(query);
    const quotes = await Quote.find(query).sort('-createdAt').skip(skip).limit(Number(limit));
    res.json({ success: true, quotes, total, pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateQuote = async (req, res) => {
  try {
    const quote = await Quote.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
    res.json({ success: true, quote });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
