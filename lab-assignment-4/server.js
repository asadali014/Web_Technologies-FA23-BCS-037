require('dotenv').config();
const express        = require('express');
const mongoose       = require('mongoose');
const path           = require('path');
const multer         = require('multer');
const methodOverride = require('method-override');
const Product        = require('./models/Product');
const User           = require('./models/User');
const session        = require('express-session');
const { MongoStore } = require('connect-mongo');
const flash          = require('connect-flash');
const bcrypt         = require('bcryptjs');

const app       = express();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/daraz';
const PORT      = process.env.PORT || 3000;
const LIMIT     = 8;

// ── View engine ────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ─────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session middleware
app.use(session({
    secret: 'secret_key_daraz',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Flash middleware
app.use(flash());

// Global Variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.session.user || null;
    next();
});

// ── Auth Middleware ────────────────────────────────────────────
const isLoggedIn = (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error_msg', 'Please log in to view this resource');
    res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') return next();
    req.flash('error_msg', 'Access Denied: Admins only');
    res.redirect('/');
};

// Static: serve assignment_1 folder (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname, '..')));
// Static: serve uploads from /public/uploads
app.use('/public', express.static(path.join(__dirname, 'public')));

// ── Multer (image upload) ──────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
    filename:    (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

// ── MongoDB ────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅  Connected to MongoDB'))
    .catch(err => console.error('❌  MongoDB error:', err));

// ── Home ───────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.render('index');
});

// ════════════════════════════════════════════════════════════════
// API ROUTES
// ════════════════════════════════════════════════════════════════
app.use('/api/v1', require('./routes/api'));

// ════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ════════════════════════════════════════════════════════════════
app.get('/register', (req, res) => res.render('auth/register'));

app.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    let errors = [];
    if (!name || !email || !password) errors.push({ msg: 'Please enter all fields' });
    if (password.length < 6) errors.push({ msg: 'Password must be at least 6 characters' });
    
    if (errors.length > 0) {
        return res.render('auth/register', { errors, name, email, error_msg: errors.map(e=>e.msg).join(', ') });
    }
    
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            req.flash('error_msg', 'Email already registered');
            return res.redirect('/register');
        }
        const newUser = new User({ name, email, password, role });
        await newUser.save();
        req.flash('success_msg', 'You are now registered and can log in');
        req.session.save(() => res.redirect('/login'));
    } catch (err) {
        console.error(err);
        res.redirect('/register');
    }
});

app.get('/login', (req, res) => res.render('auth/login'));

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/login');
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/login');
        }
        req.session.user = { id: user._id, name: user.name, role: user.role };
        req.flash('success_msg', 'Welcome back, ' + user.name + '!');
        req.session.save(() => {
            res.redirect(user.role === 'admin' ? '/admin' : '/');
        });
    } catch (err) {
        console.error(err);
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Add a profile route to demonstrate customer login
app.get('/profile', isLoggedIn, (req, res) => {
    res.send(`<h2>Welcome to your profile, ${req.session.user.name}</h2><p>Role: ${req.session.user.role}</p><a href="/">Go Home</a>`);
});

// ════════════════════════════════════════════════════════════════
// PRODUCTS (public)
// ════════════════════════════════════════════════════════════════
app.get('/products', async (req, res) => {
    try {
        const page     = Math.max(1, parseInt(req.query.page) || 1);
        const search   = (req.query.search   || '').trim();
        const category = (req.query.category || '').trim();
        const minPrice = parseFloat(req.query.minPrice) || '';
        const maxPrice = parseFloat(req.query.maxPrice) || '';
        const sort     = req.query.sort || 'default';

        const filter = {};
        if (search)   filter.name     = { $regex: search, $options: 'i' };
        if (category) filter.category = category;
        if (minPrice !== '' || maxPrice !== '') {
            filter.price = {};
            if (minPrice !== '') filter.price.$gte = minPrice;
            if (maxPrice !== '') filter.price.$lte = maxPrice;
        }

        const sortMap = {
            price_asc:   { price:  1 },
            price_desc:  { price: -1 },
            rating_desc: { rating: -1 },
            name_asc:    { name:   1 },
            default:     { _id:    1 },
        };
        const sortObj = sortMap[sort] || sortMap.default;

        const totalProducts = await Product.countDocuments(filter);
        const totalPages    = Math.ceil(totalProducts / LIMIT) || 1;
        const safePage      = Math.min(page, totalPages);

        const products   = await Product.find(filter).sort(sortObj).skip((safePage - 1) * LIMIT).limit(LIMIT).lean();
        const categories = (await Product.distinct('category')).sort();
        const filters    = { search, category, minPrice, maxPrice, sort };

        const buildQuery = (targetPage) => {
            const p = new URLSearchParams();
            if (search)          p.set('search',   search);
            if (category)        p.set('category', category);
            if (minPrice !== '') p.set('minPrice', minPrice);
            if (maxPrice !== '') p.set('maxPrice', maxPrice);
            if (sort !== 'default') p.set('sort', sort);
            p.set('page', targetPage);
            return '/products?' + p.toString();
        };

        res.render('products', { products, totalProducts, totalPages, currentPage: safePage, categories, filters, buildQuery });
    } catch (err) {
        console.error(err);
        res.status(500).send('<h2>Server error</h2>');
    }
});

// ════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ════════════════════════════════════════════════════════════════

// Helper: compute dashboard stats
async function getStats() {
    const [total, cats, lowStock, priceAgg] = await Promise.all([
        Product.countDocuments(),
        Product.distinct('category'),
        Product.countDocuments({ stock: { $gt: 0, $lte: 10 } }),
        Product.aggregate([{ $group: { _id: null, avg: { $avg: '$price' } } }])
    ]);
    return {
        total,
        categories: cats.length,
        lowStock,
        avgPrice: priceAgg.length ? priceAgg[0].avg.toFixed(0) : '0'
    };
}

// GET /admin — Dashboard
app.get('/admin', isAdmin, async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 }).lean();
        const stats    = await getStats();
        const flash    = req.query.flash
            ? { type: req.query.flash, message: req.query.msg || '' }
            : null;
        res.render('admin/dashboard', { products, stats, flash });
    } catch (err) {
        console.error(err);
        res.status(500).send('<h2>Admin error</h2>');
    }
});

// GET /admin/products/new — Add form
app.get('/admin/products/new', isAdmin, (req, res) => {
    res.render('admin/add', { flash: null, old: null });
});

// POST /admin/products — Create product
app.post('/admin/products', isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, price, category, rating, stock, description } = req.body;

        if (!name || !price || !category || !stock) {
            return res.render('admin/add', {
                flash: { type: 'error', message: 'Name, Price, Category and Stock are required.' },
                old: req.body
            });
        }

        const imagePath = req.file
            ? 'public/uploads/' + req.file.filename
            : '';

        await Product.create({ name, price: +price, category, rating: +(rating||4), stock: +stock, description, image: imagePath });
        res.redirect('/admin?flash=success&msg=Product+added+successfully');
    } catch (err) {
        console.error(err);
        res.render('admin/add', { flash: { type: 'error', message: 'Failed to save: ' + err.message }, old: req.body });
    }
});

// GET /admin/products/:id/edit — Edit form
app.get('/admin/products/:id/edit', isAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).lean();
        if (!product) return res.redirect('/admin?flash=error&msg=Product+not+found');
        res.render('admin/edit', { product, flash: null });
    } catch (err) {
        res.redirect('/admin?flash=error&msg=Invalid+product+ID');
    }
});

// POST /admin/products/:id/edit — Update product
app.post('/admin/products/:id/edit', isAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, price, category, rating, stock, description } = req.body;

        if (!name || !price || !category || !stock) {
            const product = await Product.findById(req.params.id).lean();
            return res.render('admin/edit', {
                product,
                flash: { type: 'error', message: 'Name, Price, Category and Stock are required.' }
            });
        }

        const update = { name, price: +price, category, rating: +(rating||4), stock: +stock, description };
        if (req.file) update.image = 'public/uploads/' + req.file.filename;

        await Product.findByIdAndUpdate(req.params.id, update);
        res.redirect('/admin?flash=success&msg=Product+updated+successfully');
    } catch (err) {
        console.error(err);
        res.redirect('/admin?flash=error&msg=Update+failed');
    }
});

// POST /admin/products/:id/delete — Delete product
app.post('/admin/products/:id/delete', isAdmin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/admin?flash=success&msg=Product+deleted');
    } catch (err) {
        res.redirect('/admin?flash=error&msg=Delete+failed');
    }
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀  Server: http://localhost:${PORT}`);
    console.log(`🛍️   Store:  http://localhost:${PORT}/products`);
    console.log(`⚙️   Admin:  http://localhost:${PORT}/admin`);
});