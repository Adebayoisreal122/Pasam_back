const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  shortDescription: String,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  originalPrice: Number,
  images: [{
    url: String,
    public_id: String
  }],
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isSubscribable: {
    type: Boolean,
    default: false
  },
  subscriptionIntervals: [{
    type: String,
    enum: ['weekly', 'biweekly', 'monthly']
  }],
  tags: [String],
  weight: String,
  contents: [String],
  targetAudience: {
    type: String,
    enum: ['student', 'singles', 'family', 'premium', 'all'],
    default: 'all'
  },
  minOrderQty: {
    type: Number,
    default: 1
  },
  maxOrderQty: Number,
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  salesCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

productSchema.pre('validate', function(next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true
    });
  }

  next();
});

module.exports = mongoose.model('Product', productSchema);
