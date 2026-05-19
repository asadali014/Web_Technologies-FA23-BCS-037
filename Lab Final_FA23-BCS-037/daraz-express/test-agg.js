const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/Order');
const Product = require('./models/Product');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/daraz').then(async () => {
    try {
        const [totalOrders, revenueAgg, topProductAgg, recentOrders] = await Promise.all([
            Order.countDocuments(),
            Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
            Order.aggregate([
                { $unwind: '$products' },
                { $group: { _id: '$products.product', totalQty: { $sum: '$products.quantity' } } },
                { $sort: { totalQty: -1 } },
                { $limit: 1 },
                { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
                { $unwind: { path: '$productInfo', preserveNullAndEmpty: true } }
            ]),
            Order.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name email').lean()
        ]);
        console.log('Success:', { totalOrders, revenueAgg, topProductAgg, recentOrders });
        process.exit(0);
    } catch(e) {
        console.error('ERROR:', e);
        process.exit(1);
    }
});
