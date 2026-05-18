const express        = require('express');
const mongoose       = require('mongoose');
const path           = require('path');
const multer         = require('multer');
const methodOverride = require('method-override');
const Product        = require('./models/Product');

const app       = express();
const MONGO_URI = 'mongodb://127.0.0.1:27017/daraz';
const PORT      = 3000;
const LIMIT     = 8;

// ── View engine ────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ─────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

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
    res.sendFile(path.join(__dirname, '..', 'index.html'));
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
app.get('/admin', async (req, res) => {
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
app.get('/admin/products/new', (req, res) => {
    res.render('admin/add', { flash: null, old: null });
});

// POST /admin/products — Create product
app.post('/admin/products', upload.single('image'), async (req, res) => {
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
app.get('/admin/products/:id/edit', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).lean();
        if (!product) return res.redirect('/admin?flash=error&msg=Product+not+found');
        res.render('admin/edit', { product, flash: null });
    } catch (err) {
        res.redirect('/admin?flash=error&msg=Invalid+product+ID');
    }
});

// POST /admin/products/:id/edit — Update product
app.post('/admin/products/:id/edit', upload.single('image'), async (req, res) => {
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
app.post('/admin/products/:id/delete', async (req, res) => {
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