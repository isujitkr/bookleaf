const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

router.post('/author/register', authController.authorRegister);
router.post('/author/login', authController.authorLogin);
router.post('/logout', authController.logout);
router.post('/admin/register', authController.adminRegister);
router.post('/admin/login', authController.adminLogin);
router.get('/me', authenticate, authController.getMe);

module.exports = router;