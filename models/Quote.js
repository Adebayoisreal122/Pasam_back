const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  quoteNumber: {
    type: String,
    unique: true
  },
  organizationName: {
    type: String,
    required: true
  },
  contactName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
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
    enum: ['pending', 'reviewed', 'quoted', 'accepted', 'rejected'],
    default: 'pending'
  },
  adminQuote: {
    totalAmount: Number,
    breakdown: String,
    validUntil: Date,
    notes: String
  }
}, { timestamps: true });

quoteSchema.pre('save', function(next) {
  if (!this.quoteNumber) {
    const timestamp = Date.now().toString().slice(-6);
    this.quoteNumber = `QT-${timestamp}`;
  }
  next();
});

module.exports = mongoose.model('Quote', quoteSchema);
