const express = require('express');
const router = express.Router();
const {
  createOrder, getMyOrders, getOrder, uploadPaymentProof, cancelOrder,
  getAllOrders, updateOrderStatus, getAdminOrderById
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Customer
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/my-orders/:id', protect, getOrder);
router.post('/my-orders/:id/payment-proof', protect, upload.single('proof'), uploadPaymentProof);
router.put('/my-orders/:id/cancel', protect, cancelOrder);

// Admin
router.get('/admin/all', protect, adminOnly, getAllOrders);
router.get('/admin/:id', protect, adminOnly, getAdminOrderById);
router.put('/admin/:id/status', protect, adminOnly, updateOrderStatus);

module.exports = router;
