const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

const router = express.createElement ? express.Router() : express.Router(); // fallback for old express

// ── JWT Middleware ────────────────────────────────────────────
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ error: 'Access Denied: No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Format: "Bearer <token>"
    if (!token) {
        return res.status(403).json({ error: 'Access Denied: Malformed token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

// ════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ════════════════════════════════════════════════════════════════

// GET /api/v1/products - Get all products (with pagination & filtering)
router.get('/products', async (req, res) => {
    try {
        const LIMIT = 8;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const search = (req.query.search || '').trim();
        const category = (req.query.category || '').trim();
        const minPrice = parseFloat(req.query.minPrice) || '';
        const maxPrice = parseFloat(req.query.maxPrice) || '';

        const filter = {};
        if (search) filter.name = { $regex: search, $options: 'i' };
        if (category) filter.category = category;
        if (minPrice !== '' || maxPrice !== '') {
            filter.price = {};
            if (minPrice !== '') filter.price.$gte = minPrice;
            if (maxPrice !== '') filter.price.$lte = maxPrice;
        }

        const totalProducts = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .skip((page - 1) * LIMIT)
            .limit(LIMIT)
            .lean();

        res.json({
            success: true,
            count: products.length,
            total: totalProducts,
            page,
            data: products
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error retrieving products' });
    }
});

// GET /api/v1/products/:id - Get a single product
router.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).lean();
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ success: true, data: product });
    } catch (err) {
        res.status(500).json({ error: 'Invalid product ID or server error' });
    }
});

// ════════════════════════════════════════════════════════════════
// AUTHENTICATION (JWT)
// ════════════════════════════════════════════════════════════════

// POST /api/v1/auth/login - Generate JWT
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        // Create JWT Payload
        const payload = {
            user_id: user._id,
            role: user.role
        };

        // Sign Token
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
            expiresIn: '1h'
        });

        res.json({
            success: true,
            token: token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error during login' });
    }
});

// ════════════════════════════════════════════════════════════════
// PROTECTED ENDPOINTS
// ════════════════════════════════════════════════════════════════

// GET /api/v1/user/profile - Get authenticated user profile
router.get('/user/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.user_id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ error: 'Server error retrieving profile' });
    }
});

// POST /api/v1/orders - Create an order
router.post('/orders', verifyToken, async (req, res) => {
    try {
        const { products, totalAmount } = req.body;

        if (!products || products.length === 0 || !totalAmount) {
            return res.status(400).json({ error: 'Please provide products and totalAmount' });
        }

        const order = new Order({
            user: req.user.user_id,
            products,
            totalAmount
        });

        await order.save();
        res.status(201).json({ success: true, data: order });
    } catch (err) {
        res.status(500).json({ error: 'Server error creating order' });
    }
});

module.exports = router;
