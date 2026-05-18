const mongoose = require('mongoose');
const Product  = require('./models/Product');

const MONGO_URI = 'mongodb://127.0.0.1:27017/daraz';

const products = [
  // Electronics
  { name: 'Samsung Galaxy S24',       price: 1099, category: 'Electronics', rating: 4.7, stock: 45,  description: 'Flagship Android smartphone with AI features.',        image: 'https://placehold.co/300x220/1a1a2e/ffffff?text=Galaxy+S24' },
  { name: 'Apple iPhone 15',          price: 1299, category: 'Electronics', rating: 4.8, stock: 30,  description: 'Apple\'s powerhouse with Dynamic Island display.',       image: 'https://placehold.co/300x220/1a1a2e/ffffff?text=iPhone+15' },
  { name: 'Sony WH-1000XM5',          price: 349,  category: 'Electronics', rating: 4.9, stock: 60,  description: 'Best-in-class noise-cancelling headphones.',             image: 'https://placehold.co/300x220/1a1a2e/ffffff?text=Sony+XM5' },
  { name: 'HP Laptop 15',             price: 799,  category: 'Electronics', rating: 4.3, stock: 20,  description: 'Everyday laptop with Intel Core i5 & 8GB RAM.',          image: 'https://placehold.co/300x220/1a1a2e/ffffff?text=HP+Laptop' },
  { name: 'iPad Air 5th Gen',         price: 749,  category: 'Electronics', rating: 4.6, stock: 35,  description: 'M1 chip, 10.9-inch Liquid Retina display.',              image: 'https://placehold.co/300x220/1a1a2e/ffffff?text=iPad+Air' },
  { name: 'Logitech MX Master 3',     price: 99,   category: 'Electronics', rating: 4.8, stock: 80,  description: 'Advanced wireless mouse for professionals.',             image: 'https://placehold.co/300x220/1a1a2e/ffffff?text=MX+Master' },
  { name: 'Dell 27" Monitor',         price: 399,  category: 'Electronics', rating: 4.5, stock: 25,  description: '4K UHD IPS panel with USB-C connectivity.',              image: 'https://placehold.co/300x220/1a1a2e/ffffff?text=Dell+Monitor' },
  { name: 'Apple Watch Series 9',     price: 429,  category: 'Electronics', rating: 4.7, stock: 50,  description: 'Advanced health tracking & Double Tap gesture.',          image: 'https://placehold.co/300x220/1a1a2e/ffffff?text=Apple+Watch' },

  // Fashion
  { name: 'Women Embroidered Kurta',  price: 29,   category: 'Fashion',     rating: 4.2, stock: 150, description: 'Elegant Pakistani lawn kurta with embroidery.',          image: 'https://placehold.co/300x220/2d1b69/ffffff?text=Kurta' },
  { name: 'Men\'s Slim Fit Chinos',   price: 49,   category: 'Fashion',     rating: 4.4, stock: 100, description: 'Stretch chino pants, multiple colors available.',        image: 'https://placehold.co/300x220/2d1b69/ffffff?text=Chinos' },
  { name: 'Leather Handbag',          price: 89,   category: 'Fashion',     rating: 4.6, stock: 40,  description: 'Genuine leather tote bag with gold hardware.',           image: 'https://placehold.co/300x220/2d1b69/ffffff?text=Handbag' },
  { name: 'Running Sneakers Pro',     price: 75,   category: 'Fashion',     rating: 4.3, stock: 90,  description: 'Lightweight mesh sneakers for daily running.',           image: 'https://placehold.co/300x220/2d1b69/ffffff?text=Sneakers' },
  { name: 'Silk Evening Dress',       price: 120,  category: 'Fashion',     rating: 4.5, stock: 30,  description: 'Floor-length silk dress perfect for formal events.',     image: 'https://placehold.co/300x220/2d1b69/ffffff?text=Silk+Dress' },
  { name: 'Men\'s Formal Suit',       price: 199,  category: 'Fashion',     rating: 4.4, stock: 20,  description: 'Slim-fit two-piece suit in charcoal grey.',              image: 'https://placehold.co/300x220/2d1b69/ffffff?text=Suit' },

  // Home
  { name: 'Non-Stick Pan Set (5pc)',  price: 55,   category: 'Home',        rating: 4.4, stock: 70,  description: 'Granite-coated non-stick cookware set.',                 image: 'https://placehold.co/300x220/0d3b2e/ffffff?text=Pan+Set' },
  { name: 'Memory Foam Pillow',       price: 39,   category: 'Home',        rating: 4.7, stock: 120, description: 'Ergonomic contour pillow for neck support.',             image: 'https://placehold.co/300x220/0d3b2e/ffffff?text=Pillow' },
  { name: 'Air Purifier HEPA',        price: 189,  category: 'Home',        rating: 4.6, stock: 35,  description: 'True HEPA filter, covers rooms up to 500 sq ft.',       image: 'https://placehold.co/300x220/0d3b2e/ffffff?text=Air+Purifier' },
  { name: 'Robot Vacuum Cleaner',     price: 299,  category: 'Home',        rating: 4.5, stock: 25,  description: 'Auto-mapping robot vacuum with mop function.',           image: 'https://placehold.co/300x220/0d3b2e/ffffff?text=Robot+Vacuum' },
  { name: 'LED Desk Lamp',            price: 35,   category: 'Home',        rating: 4.3, stock: 200, description: 'Touch-dimming LED lamp with USB charging port.',         image: 'https://placehold.co/300x220/0d3b2e/ffffff?text=Desk+Lamp' },
  { name: 'Wooden Bookshelf 5-Tier',  price: 149,  category: 'Home',        rating: 4.4, stock: 18,  description: 'Solid pine bookshelf with anti-tip safety strap.',      image: 'https://placehold.co/300x220/0d3b2e/ffffff?text=Bookshelf' },

  // Sports
  { name: 'Dumbbell Set 20kg',        price: 89,   category: 'Sports',      rating: 4.6, stock: 55,  description: 'Adjustable rubber-coated hex dumbbell set.',            image: 'https://placehold.co/300x220/1a0a2e/ffffff?text=Dumbbells' },
  { name: 'Yoga Mat Premium',         price: 45,   category: 'Sports',      rating: 4.5, stock: 90,  description: 'Extra-thick 6mm non-slip TPE yoga mat.',                image: 'https://placehold.co/300x220/1a0a2e/ffffff?text=Yoga+Mat' },
  { name: 'PS5 DualSense Controller', price: 69,   category: 'Gaming',      rating: 4.8, stock: 60,  description: 'Haptic feedback & adaptive triggers controller.',        image: 'https://placehold.co/300x220/0a1a2e/ffffff?text=PS5+Controller' },
  { name: 'Cycling Helmet Pro',       price: 59,   category: 'Sports',      rating: 4.4, stock: 45,  description: 'MIPS-protected aerodynamic road cycling helmet.',        image: 'https://placehold.co/300x220/1a0a2e/ffffff?text=Helmet' },
  { name: 'Resistance Bands Set',     price: 25,   category: 'Sports',      rating: 4.3, stock: 150, description: 'Set of 5 latex resistance bands for home workouts.',    image: 'https://placehold.co/300x220/1a0a2e/ffffff?text=Bands' },

  // Gaming
  { name: 'Gaming Chair Ergonomic',   price: 299,  category: 'Gaming',      rating: 4.5, stock: 20,  description: 'Racing-style chair with lumbar & neck support.',         image: 'https://placehold.co/300x220/0a1a2e/ffffff?text=Gaming+Chair' },
  { name: 'Mechanical Keyboard RGB',  price: 129,  category: 'Gaming',      rating: 4.7, stock: 40,  description: 'TKL mechanical keyboard with per-key RGB backlight.',    image: 'https://placehold.co/300x220/0a1a2e/ffffff?text=Keyboard' },
  { name: 'Gaming Headset 7.1',       price: 89,   category: 'Gaming',      rating: 4.4, stock: 55,  description: 'Surround sound headset with noise-cancelling mic.',      image: 'https://placehold.co/300x220/0a1a2e/ffffff?text=Headset' },
  { name: 'Nintendo Switch OLED',     price: 349,  category: 'Gaming',      rating: 4.9, stock: 30,  description: 'Vibrant 7-inch OLED screen handheld console.',           image: 'https://placehold.co/300x220/0a1a2e/ffffff?text=Nintendo+Switch' },
];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('✅  Connected to MongoDB');

    const count = await Product.countDocuments();
    if (count >= products.length) {
        console.log(`ℹ️  DB already has ${count} products — skipping seed.`);
        await mongoose.disconnect();
        return;
    }

    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log(`✅  Seeded ${products.length} products into MongoDB.`);
    await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
