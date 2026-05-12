const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { sendOrderConfirmationEmail } = require('../utils/email');
const { generateWhatsAppOrderLink } = require('../utils/whatsapp');

const DELIVERY_FEES = {
  'Lagos': 1500,
  'Abuja': 2000,
  'Ibadan': 1000,
  'Port Harcourt': 2500,
  'Kano': 3000,
  'default': 2000
};

exports.createOrder = async (req, res) => {
  try {
    const { items, deliveryInfo, couponCode, isSubscription, subscriptionInterval } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }

    // Validate items & calculate subtotal
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return res.status(400).json({ success: false, message: `Product ${item.product} not found or unavailable` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0]?.url || '',
        price: product.price,
        quantity: item.quantity
      });
    }

    // Delivery fee
    const city = deliveryInfo.city || '';
    const deliveryFee = DELIVERY_FEES[city] || DELIVERY_FEES['default'];

    // Coupon
    let discount = 0;
    let couponDoc = null;
    if (couponCode) {
      couponDoc = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        $or: [{ expiresAt: { $gte: new Date() } }, { expiresAt: null }]
      });

      if (!couponDoc) {
        return res.status(400).json({ success: false, message: 'Invalid or expired coupon' });
      }
      if (couponDoc.usageLimit && couponDoc.usedCount >= couponDoc.usageLimit) {
        return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
      }
      if (subtotal < couponDoc.minOrderAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount for this coupon is ₦${couponDoc.minOrderAmount.toLocaleString()}`
        });
      }

      if (couponDoc.type === 'percentage') {
        discount = (subtotal * couponDoc.value) / 100;
        if (couponDoc.maxDiscount) discount = Math.min(discount, couponDoc.maxDiscount);
      } else {
        discount = couponDoc.value;
      }
    }

    const totalAmount = subtotal + deliveryFee - discount;

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      subtotal,
      deliveryFee,
      discount,
      totalAmount,
      coupon: couponDoc?._id,
      deliveryInfo,
      paymentMethod: 'bank_transfer',
      isSubscription: isSubscription || false,
      subscriptionInterval: isSubscription ? subscriptionInterval : undefined,
      statusHistory: [{ status: 'pending', note: 'Order placed', updatedBy: req.user._id }]
    });

    // Reduce stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, salesCount: item.quantity }
      });
    }

    // Increment coupon usage
    if (couponDoc) {
      await Coupon.findByIdAndUpdate(couponDoc._id, { $inc: { usedCount: 1 } });
    }

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(req.user.email, order, req.user.fullname);
    } catch (emailErr) {
      console.error('Email send error:', emailErr.message);
    }

    // Generate WhatsApp link
    const whatsappLink = generateWhatsAppOrderLink(order, process.env.WHATSAPP_BUSINESS_NUMBER);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order,
      whatsappLink
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const total = await Order.countDocuments({ user: req.user._id });
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name images')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit));

    res.json({ success: true, orders, total, pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('items.product', 'name images category');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadPaymentProof = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const { uploadImage } = require('../utils/cloudinary');
    const result = await uploadImage(req.file.buffer, 'pasam/payment-proofs');

    order.paymentProof = { ...result, uploadedAt: new Date() };
    order.paymentStatus = 'pending';
    order.statusHistory.push({ status: order.deliveryStatus, note: 'Payment proof uploaded', updatedBy: req.user._id });
    await order.save();

    res.json({ success: true, message: 'Payment proof uploaded', order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (['shipped', 'delivered'].includes(order.deliveryStatus)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel order at this stage' });
    }

    order.deliveryStatus = 'cancelled';
    order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer', updatedBy: req.user._id });

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    await order.save();
    res.json({ success: true, message: 'Order cancelled', order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin controllers
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus, search } = req.query;
    const query = {};
    if (status) query.deliveryStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) query.orderNumber = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'fullname email phone')
      .populate('items.product', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit));

    res.json({ success: true, orders, total, pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { deliveryStatus, paymentStatus, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (deliveryStatus) order.deliveryStatus = deliveryStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    order.statusHistory.push({
      status: deliveryStatus || order.deliveryStatus,
      note: note || `Status updated by admin`,
      updatedBy: req.user._id
    });

    await order.save();
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'fullname email phone address')
      .populate('items.product', 'name images price category');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
