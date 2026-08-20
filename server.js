require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_citytourslanka_jwt_2026';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/travel_bookings';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.error('❌ DB Error:', err));

// --- SCHEMAS ---
const settingsSchema = new mongoose.Schema({
  siteName: { type: String, default: 'CityToursLanka' },
  heroTitle: { type: String, default: 'Pure Wonder. Untamed Island.' },
  heroSubtitle: { type: String, default: 'From misty mountain peaks and UNESCO royal fortresses to wild ocean shores.' },
  heroImage: { type: String, default: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=2000&q=85' },
  phone: { type: String, default: '+94 77 123 4567' },
  email: { type: String, default: 'explore@citytourslanka.com' },
  whatsapp: { type: String, default: '94771234567' }
});
const Settings = mongoose.model('Settings', settingsSchema);

const packageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, default: 'Cultural' },
  duration: { type: String, required: true },
  priceUSD: { type: Number, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  itinerary: [{ day: String, title: String, desc: String }],
  includes: [String],
  createdAt: { type: Date, default: Date.now }
});
const Package = mongoose.model('Package', packageSchema);

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  priceUSD: { type: Number, required: true },
  image: { type: String, required: true },
  weight: { type: String, default: '500g' },
  stock: { type: Number, default: 50 },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const Product = mongoose.model('Product', productSchema);

const bookingSchema = new mongoose.Schema({
  fullName: String, email: String, package: String, travelDate: String, guests: Number, totalPrice: Number,
  status: { type: String, default: 'Pending' }, createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', bookingSchema);

const orderSchema = new mongoose.Schema({
  customerName: String, customerEmail: String, shippingAddress: String, country: String,
  items: Array, totalUSD: Number, status: { type: String, default: 'Processing' }, createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// Auth Middleware
const verifyAdmin = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Forbidden' });
    req.user = user;
    next();
  });
};

// --- PUBLIC ROUTES ---
app.get('/api/settings', async (req, res) => res.json({ success: true, data: await Settings.findOne() || new Settings() }));
app.get('/api/packages', async (req, res) => res.json({ success: true, data: await Package.find().sort({ createdAt: -1 }) }));
app.get('/api/packages/:id', async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    res.json({ success: true, data: pkg });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

app.get('/api/products', async (req, res) => res.json({ success: true, data: await Product.find().sort({ createdAt: -1 }) }));
app.get('/api/products/:id', async (req, res) => {
  try {
    const prod = await Product.findById(req.params.id);
    res.json({ success: true, data: prod });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

app.post('/api/bookings', async (req, res) => res.status(201).json({ success: true, data: await new Booking(req.body).save() }));
app.post('/api/orders', async (req, res) => res.status(201).json({ success: true, data: await new Order(req.body).save() }));

// --- ADMIN ROUTES ---
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === (process.env.ADMIN_EMAIL || 'admin@ceylontrails.com') && 
      password === (process.env.ADMIN_PASSWORD || 'AdminPass@123')) {
    return res.json({ success: true, token: jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' }) });
  }
  res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
});

app.put('/api/admin/settings', verifyAdmin, async (req, res) => {
  let s = await Settings.findOne() || new Settings();
  Object.assign(s, req.body);
  await s.save();
  res.json({ success: true, data: s });
});

// Packages CRUD (Add, Edit, Delete)
app.post('/api/admin/packages', verifyAdmin, async (req, res) => res.status(201).json({ success: true, data: await new Package(req.body).save() }));
app.put('/api/admin/packages/:id', verifyAdmin, async (req, res) => {
  try {
    const updated = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});
app.delete('/api/admin/packages/:id', verifyAdmin, async (req, res) => {
  await Package.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Package Deleted' });
});

// Products CRUD
app.post('/api/admin/products', verifyAdmin, async (req, res) => res.status(201).json({ success: true, data: await new Product(req.body).save() }));
app.put('/api/admin/products/:id', verifyAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});
app.delete('/api/admin/products/:id', verifyAdmin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Product Deleted' });
});

// Orders & Bookings Management
app.get('/api/admin/orders', verifyAdmin, async (req, res) => res.json({ success: true, data: await Order.find().sort({ createdAt: -1 }) }));
app.patch('/api/admin/orders/:id', verifyAdmin, async (req, res) => res.json({ success: true, data: await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }) }));
app.delete('/api/admin/orders/:id', verifyAdmin, async (req, res) => { await Order.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/admin/bookings', verifyAdmin, async (req, res) => res.json({ success: true, data: await Booking.find().sort({ createdAt: -1 }) }));
app.patch('/api/admin/bookings/:id', verifyAdmin, async (req, res) => res.json({ success: true, data: await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }) }));
app.delete('/api/admin/bookings/:id', verifyAdmin, async (req, res) => { await Booking.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));