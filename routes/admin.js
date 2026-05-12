const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getAllUsers, toggleSuspendUser,
  getUserOrderHistory, getAnalytics
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/dashboard', getDashboardStats);
router.get('/analytics', getAnalytics);
router.get('/users', getAllUsers);
router.put('/users/:id/suspend', toggleSuspendUser);
router.get('/users/:id/orders', getUserOrderHistory);

module.exports = router;
