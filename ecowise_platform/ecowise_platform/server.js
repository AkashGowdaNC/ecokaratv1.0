const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const { User, Pickup, SmartBin, PlasticLot } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecokarat';
const JWT_SECRET = process.env.JWT_SECRET || 'ecokarat_secret_2026';

mongoose.connect(MONGO_URI).then(() => console.log('MongoDB connected')).catch(e => console.log('MongoDB error:', e.message));

// ==========================================
// Authentication Middleware
// ==========================================
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { 
    req.user = jwt.verify(token, JWT_SECRET); 
    next(); 
  }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

// ==========================================
// RBAC Middlewares (Strict Isolation)
// ==========================================
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied: Admin only' });
  next();
};

const isCustomer = (req, res, next) => {
  if (req.user.role !== 'customer_hall' && req.user.role !== 'customer_commercial') {
    return res.status(403).json({ error: 'Access denied: Customers only' });
  }
  next();
};

const isRecycler = (req, res, next) => {
  if (req.user.role !== 'recycler') return res.status(403).json({ error: 'Access denied: Recyclers only' });
  next();
};

// ==========================================
// Public Routes (Auth)
// ==========================================
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role, phone });
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Wrong password' });
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// 1. The Admin Environment (Full Access)
// ==========================================
app.get('/api/admin/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/pickups', auth, isAdmin, async (req, res) => {
  try {
    const pickups = await Pickup.find().populate('hallId', 'name email phone').sort({ createdAt: -1 });
    res.json(pickups);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/smartbins', auth, isAdmin, async (req, res) => {
  try {
    const bins = await SmartBin.find().populate('assignedToUserId', 'name email phone').sort({ needsCollection: -1 });
    res.json(bins);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/lots', auth, isAdmin, async (req, res) => {
  try {
    const { lotId, weightKg, assignedRecyclerId } = req.body;
    const lot = await PlasticLot.create({ lotId, weightKg, assignedRecyclerId });
    res.json(lot);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/lots', auth, isAdmin, async (req, res) => {
  try {
    const lots = await PlasticLot.find().populate('assignedRecyclerId', 'name').sort({ createdAt: -1 });
    res.json(lots);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/pickups/:id/complete', auth, isAdmin, async (req, res) => {
  try {
    const pickup = await Pickup.findByIdAndUpdate(req.params.id, { status: 'Collected' }, { new: true });
    res.json(pickup);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// 2. The Customer Environment
// ==========================================
// Marriage Halls: Book Pickups
app.post('/api/customer/pickups', auth, isCustomer, async (req, res) => {
  if (req.user.role !== 'customer_hall') return res.status(403).json({ error: 'Only halls can book manual pickups' });
  try {
    const { date, time, estimatedKg, location } = req.body;
    const pickup = await Pickup.create({ hallId: req.user.id, date, time, estimatedKg, location });
    res.json(pickup);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/customer/pickups', auth, isCustomer, async (req, res) => {
  if (req.user.role !== 'customer_hall') return res.status(403).json({ error: 'Only halls can view their pickups' });
  try {
    const pickups = await Pickup.find({ hallId: req.user.id }).sort({ createdAt: -1 });
    res.json(pickups);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Commercial: Smart Bin Status
app.get('/api/customer/smartbin', auth, isCustomer, async (req, res) => {
  if (req.user.role !== 'customer_commercial') return res.status(403).json({ error: 'Only commercial users have smart bins' });
  try {
    const bin = await SmartBin.findOne({ assignedToUserId: req.user.id });
    res.json(bin);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// 3. The Recycler Environment
// ==========================================
app.get('/api/recycler/lots', auth, isRecycler, async (req, res) => {
  try {
    const lots = await PlasticLot.find({ assignedRecyclerId: req.user.id }).sort({ createdAt: -1 });
    res.json(lots);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/recycler/lots/:id/status', auth, isRecycler, async (req, res) => {
  try {
    const { status } = req.body; // 'Acknowledged', 'Processing', 'Completed'
    const lot = await PlasticLot.findOneAndUpdate(
      { _id: req.params.id, assignedRecyclerId: req.user.id },
      { status },
      { new: true }
    );
    if (!lot) return res.status(404).json({ error: 'Lot not found or not assigned to you' });
    res.json(lot);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// SEED DEMO DATA
// ==========================================
app.post('/api/seed', async (req, res) => {
  try {
    await User.deleteMany({}); await Pickup.deleteMany({}); await SmartBin.deleteMany({}); await PlasticLot.deleteMany({});
    
    const pass = await bcrypt.hash('demo123', 10);
    const admin = await User.create({ name: 'Super Admin', email: 'admin@ecokarat.com', password: pass, role: 'admin' });
    const hall = await User.create({ name: 'Grand Palace Hall', email: 'hall@demo.com', password: pass, role: 'customer_hall', phone: '9876543210' });
    const commercial = await User.create({ name: 'City Mall', email: 'mall@demo.com', password: pass, role: 'customer_commercial', phone: '9876543211' });
    const recycler = await User.create({ name: 'Global Recyclers', email: 'recycler@demo.com', password: pass, role: 'recycler', phone: '9876543212' });

    await Pickup.create([
      { hallId: hall._id, date: new Date('2026-05-01'), time: '10:00 AM', estimatedKg: 150, location: 'Downtown', status: 'Pending' }
    ]);

    await SmartBin.create({
      assignedToUserId: commercial._id, location: 'City Mall Back Alley', sensorFillLevelPercentage: 85, needsCollection: true
    });

    await PlasticLot.create([
      { lotId: 'LOT-1001', weightKg: 500, assignedRecyclerId: recycler._id, status: 'Allocated' }
    ]);

    res.json({ message: 'Demo data seeded!', logins: { admin: 'admin@ecokarat.com', hall: 'hall@demo.com', commercial: 'mall@demo.com', recycler: 'recycler@demo.com', password: 'demo123' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.use((req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EcoKarat running on http://localhost:${PORT}`));
