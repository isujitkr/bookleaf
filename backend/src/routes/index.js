const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const authorRoutes = require('./author');
const adminRoutes = require('./admin');

router.use('/auth', authRoutes);
router.use('/author', authorRoutes);
router.use('/admin', adminRoutes);

module.exports = router;