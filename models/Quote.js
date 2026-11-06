const mongoose = require('mongoose');
const crypto = require('crypto');

const quoteSchema = new mongoose.Schema({
  quoteNumber: { type: String, unique: true },

  // Secret used in the customer's email link. Never returned by normal queries.
  accessToken: { type: String, select: false },

  organizationName: { type: String, required: true },
  contactName:      { type: String, required: true },
  email:            { type: String, required: true },
  phone:            { type: String, required: true },
  organizationType: {
    type: String,
    enum: ['church', 'ngo', 'school', 'company', 'event', 'welfare', 'other']
  },
  items: [{
    productName: String,
    quantity: Number,
    notes: String
  }],
  deliveryDate: Date,
  deliveryAddress: String,
  additionalNotes: String,

  status: {
    type: String,
    enum: ['pending', 'reviewed', 'quoted', 'accepted', 'declined', 'rejected'],
    default: 'pending'
  },

  // Set by admin
  adminQuote: {
    totalAmount: Number,
    breakdown: String,
    validUntil: Date,
    notes: String
  },

  // Set by the customer when they accept or decline
  customerResponse: {
    decision: { type: String, enum: ['accepted', 'declined'] },
    message: String,
    respondedAt: Date
  }
}, { timestamps: true });

// Only generate on creation. accessToken is select:false, so on later saves
// it looks undefined and would otherwise be regenerated, breaking old links.
quoteSchema.pre('save', function (next) {
  if (this.isNew) {
    if (!this.quoteNumber) {
      const ts = Date.now().toString().slice(-6);
      const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
      this.quoteNumber = `QT-${ts}-${rand}`;
    }
    if (!this.accessToken) {
      this.accessToken = crypto.randomBytes(16).toString('hex');
    }
  }
  next();
});

module.exports = mongoose.model('Quote', quoteSchema);
