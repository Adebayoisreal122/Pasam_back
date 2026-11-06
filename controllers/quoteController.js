const crypto = require('crypto');
const Quote = require('../models/Quote');
const emails = require('../utils/quoteEmails');

// ── helpers ───────────────────────────────────────────
const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

const viewUrl = (quote) =>
  `${clientUrl()}/store/quotes/${encodeURIComponent(quote.quoteNumber)}?token=${quote.accessToken}`;

const safeEqual = (a = '', b = '') => {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

const logEmailError = (label) => (err) => console.error(`${label} failed:`, err.message);

// Find a quote for a customer. They must prove access with the emailed token
// OR the email address used on the form. Returns null on any mismatch so the
// API never reveals whether a quote number exists.
const findForCustomer = async (quoteNumber, { token, email } = {}) => {
  const quote = await Quote.findOne({ quoteNumber }).select('+accessToken');
  if (!quote) return null;

  const tokenOk = token && quote.accessToken && safeEqual(token, quote.accessToken);
  const emailOk =
    email && String(email).trim().toLowerCase() === String(quote.email).trim().toLowerCase();

  return tokenOk || emailOk ? quote : null;
};

const isExpired = (quote) =>
  quote.status === 'quoted' &&
  !!quote.adminQuote?.validUntil &&
  new Date(quote.adminQuote.validUntil) < new Date();

// What a customer is allowed to see
const publicView = (quote) => ({
  quoteNumber: quote.quoteNumber,
  organizationName: quote.organizationName,
  contactName: quote.contactName,
  organizationType: quote.organizationType,
  items: quote.items,
  deliveryDate: quote.deliveryDate,
  deliveryAddress: quote.deliveryAddress,
  additionalNotes: quote.additionalNotes,
  status: quote.status,
  adminQuote: quote.adminQuote,
  customerResponse: quote.customerResponse,
  isExpired: isExpired(quote),
  createdAt: quote.createdAt,
});

// ── customer: submit ──────────────────────────────────
exports.submitQuote = async (req, res) => {
  try {
    const {
      organizationName, contactName, email, phone, organizationType,
      items, deliveryDate, deliveryAddress, additionalNotes,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one item to your request.' });
    }

    // Whitelist fields so a client can never set status / adminQuote themselves
    const quote = await Quote.create({
      organizationName, contactName, email, phone, organizationType,
      items: items.map(i => ({
        productName: i.productName,
        quantity: Number(i.quantity),
        notes: i.notes,
      })),
      deliveryDate: deliveryDate || undefined,
      deliveryAddress,
      additionalNotes,
    });

    res.status(201).json({
      success: true,
      message: 'Quote request submitted. We will contact you within 24 hours.',
      quote: { _id: quote._id, quoteNumber: quote.quoteNumber, accessToken: quote.accessToken },
    });

    // Emails run after the response so a slow mail server never blocks the form
    const url = viewUrl(quote);
    emails.sendQuoteReceivedEmail(quote, url).catch(logEmailError('Quote confirmation email'));
    emails.sendNewQuoteAdminEmail(quote).catch(logEmailError('Admin new-quote email'));
  } catch (error) {
    console.error('Submit quote error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── customer: public view + respond ───────────────────
exports.getPublicQuote = async (req, res) => {
  try {
    const quote = await findForCustomer(req.params.quoteNumber, {
      token: req.query.token,
      email: req.query.email,
    });
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: 'Quote not found. Check the quote number and the email address you used.',
      });
    }
    res.json({ success: true, quote: publicView(quote) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.respondToQuote = async (req, res) => {
  try {
    const { token, email, decision, message } = req.body;

    if (!['accept', 'decline'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be accept or decline.' });
    }

    const quote = await findForCustomer(req.params.quoteNumber, { token, email });
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found.' });
    }
    if (quote.status !== 'quoted') {
      return res.status(400).json({ success: false, message: 'This quote is not waiting for a response.' });
    }
    if (isExpired(quote)) {
      return res.status(400).json({
        success: false,
        message: 'This quote has expired. Please contact us for an updated price.',
      });
    }

    const accepted = decision === 'accept';
    quote.status = accepted ? 'accepted' : 'declined';
    quote.customerResponse = {
      decision: accepted ? 'accepted' : 'declined',
      message: String(message || '').slice(0, 500),
      respondedAt: new Date(),
    };
    await quote.save();

    res.json({ success: true, quote: publicView(quote) });

    emails.sendQuoteResponseAdminEmail(quote).catch(logEmailError('Admin quote-response email'));
  } catch (error) {
    console.error('Respond to quote error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── logged-in customer ────────────────────────────────
exports.getMyQuotes = async (req, res) => {
  try {
    const quotes = await Quote.find({ email: req.user.email }).sort('-createdAt');
    res.json({ success: true, quotes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── admin ─────────────────────────────────────────────
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
    const { status, adminQuote } = req.body;

    const existing = await Quote.findById(req.params.id).select('+accessToken');
    if (!existing) return res.status(404).json({ success: false, message: 'Quote not found' });

    // Remember the previous values before the update, to decide whether to email
    const prevStatus = existing.status;
    const prevAmount = existing.adminQuote?.totalAmount;
    const hadToken = !!existing.accessToken;

    const $set = {};
    const $unset = {};

    if (status) $set.status = status;

    if (adminQuote) {
      $set.adminQuote = {
        totalAmount: adminQuote.totalAmount !== '' && adminQuote.totalAmount != null
          ? Number(adminQuote.totalAmount) : undefined,
        breakdown: adminQuote.breakdown,
        notes: adminQuote.notes,
        validUntil: adminQuote.validUntil ? new Date(adminQuote.validUntil) : undefined,
      };
    }

    // Quotes created before this feature have no token. Give them one so the email link works.
    if (!hadToken) $set.accessToken = crypto.randomBytes(16).toString('hex');

    // Re-quoting after the customer already responded starts the conversation over
    const movingToQuoted = status === 'quoted' && prevStatus !== 'quoted';
    if (movingToQuoted) $unset.customerResponse = '';

    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;

    const updated = await Quote.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).select('+accessToken');

    // Email the customer when the quote becomes ready, or the amount changes
    const newAmount = updated.adminQuote?.totalAmount;
    const amountChanged = newAmount !== prevAmount;
    const shouldEmail =
      updated.status === 'quoted' && !!newAmount && (prevStatus !== 'quoted' || amountChanged);

    res.json({
      success: true,
      emailed: shouldEmail,
      quote: (() => { const q = updated.toObject(); delete q.accessToken; return q; })(),
    });

    if (shouldEmail) {
      emails.sendQuoteReadyEmail(updated, viewUrl(updated)).catch(logEmailError('Quote ready email'));
    }
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
