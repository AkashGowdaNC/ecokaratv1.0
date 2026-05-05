const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'customer_hall', 'customer_commercial', 'recycler'], required: true },
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

const PickupSchema = new mongoose.Schema({
  hallId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  time: String,
  estimatedKg: Number,
  location: String,
  status: { type: String, enum: ['Pending', 'Collected'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});

const SmartBinSchema = new mongoose.Schema({
  assignedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: String,
  sensorFillLevelPercentage: { type: Number, default: 0 },
  needsCollection: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const PlasticLotSchema = new mongoose.Schema({
  lotId: { type: String, required: true, unique: true },
  weightKg: { type: Number, required: true },
  assignedRecyclerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Allocated', 'Acknowledged', 'Processing', 'Completed'], default: 'Allocated' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  User: mongoose.model('User', UserSchema),
  Pickup: mongoose.model('Pickup', PickupSchema),
  SmartBin: mongoose.model('SmartBin', SmartBinSchema),
  PlasticLot: mongoose.model('PlasticLot', PlasticLotSchema)
};
