const express = require('express');
const router = express.Router();
const {
  getProducts, getProduct, getFeaturedProducts,
  getProductsByCategory, createProduct, updateProduct,
  deleteProduct, deleteProductImage, getProductBySlug
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/:id', getProduct);
router.get('/slug/:slug', getProductBySlug);
// Admin
router.post('/', protect, adminOnly, upload.array('images', 5), createProduct);
router.put('/:id', protect, adminOnly, upload.array('images', 5), updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);
router.delete('/:id/images/:publicId', protect, adminOnly, deleteProductImage);

module.exports = router;
