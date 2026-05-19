const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    stock: { type: Number, default: 0 },
    description: { type: String, default: '' },
    image: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
