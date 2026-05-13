const Product = require('../models/Product');
const { uploadImage, deleteImage } = require('../utils/cloudinary');
const mongoose = require('mongoose');


exports.getProducts = async (req, res) => {
  try {
    const {
      category, featured, search, minPrice, maxPrice,
      page = 1, limit = 12, sort = '-createdAt'
    } = req.query;

    const query = { isActive: true };
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (search) query.$text = { $search: search };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug color icon')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      products
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// exports.getProduct = async (req, res) => {
//   try {
//     const param = req.params.id;

//     let product;

//     if (mongoose.Types.ObjectId.isValid(param)) {
//       // Safe to search both
//       product = await Product.findOne({
//         $or: [{ _id: param }, { slug: param }],
//         isActive: true
//       }).populate('category', 'name slug color');
//     } else {
//       // ONLY search by slug (this avoids crash)
//       product = await Product.findOne({
//         slug: param,
//         isActive: true
//       }).populate('category', 'name slug color');
//     }

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: 'Product not found'
//       });
//     }

//     res.json({
//       success: true,
//       product
//     });

//   } catch (error) {
//     console.error('PRODUCT ERROR:', error);

//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }};

exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true
    }).populate('category', 'name slug color icon');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .populate('category', 'name slug color')
      .limit(8)
      .sort('-createdAt');
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const products = await Product.find({
      category: req.params.categoryId,
      isActive: true
    }).populate('category', 'name slug').sort('-createdAt');
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin
exports.createProduct = async (req, res) => {
  try {
    const {
      name, description, shortDescription, category, price,
      originalPrice, stock, isFeatured, isSubscribable,
      subscriptionIntervals, tags, weight, contents, targetAudience,
      minOrderQty, maxOrderQty
    } = req.body;

    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await uploadImage(file.buffer, 'pasam/products');
        images.push(uploaded);
      }
    }

    const product = await Product.create({
      name, description, shortDescription, category, price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      stock: Number(stock), isFeatured: isFeatured === 'true', isSubscribable: isSubscribable === 'true',
      subscriptionIntervals: subscriptionIntervals ? JSON.parse(subscriptionIntervals) : [],
      tags: tags ? JSON.parse(tags) : [],
      weight, contents: contents ? JSON.parse(contents) : [],
      targetAudience, minOrderQty: Number(minOrderQty) || 1,
      maxOrderQty: maxOrderQty ? Number(maxOrderQty) : undefined,
      images
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const updates = { ...req.body };
    if (updates.price) updates.price = Number(updates.price);
    if (updates.stock) updates.stock = Number(updates.stock);
    if (updates.isFeatured) updates.isFeatured = updates.isFeatured === 'true';
    if (updates.tags) updates.tags = JSON.parse(updates.tags);
    if (updates.contents) updates.contents = JSON.parse(updates.contents);

    if (req.files && req.files.length > 0) {
      const newImages = [];
      for (const file of req.files) {
        const uploaded = await uploadImage(file.buffer, 'pasam/products');
        newImages.push(uploaded);
      }
      updates.images = [...product.images, ...newImages];
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true, runValidators: true
    }).populate('category', 'name slug');

    res.json({ success: true, product: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    for (const image of product.images) {
      if (image.public_id) await deleteImage(image.public_id);
    }

    await product.deleteOne();
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProductImage = async (req, res) => {
  try {
    const { id, publicId } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    await deleteImage(publicId);
    product.images = product.images.filter(img => img.public_id !== publicId);
    await product.save();

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
