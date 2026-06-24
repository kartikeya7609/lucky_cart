import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 30
  },
  email_address: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password_hash: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    default: 10000.0
  },
  role: {
    type: String,
    enum: ['consumer', 'seller'],
    default: 'consumer'
  },
  full_name: {
    type: String,
    required: true
  },
  phone_number: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  zip_code: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password_hash')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
  } catch (err) {
    throw err;
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (attemptedPassword) {
  return await bcrypt.compare(attemptedPassword, this.password_hash);
};

// Check if user has sufficient budget
userSchema.methods.canPurchase = function (amount) {
  return this.budget >= amount;
};

// Virtual prettier budget
userSchema.virtual('prettier_budget').get(function () {
  const b = Math.floor(this.budget);
  const s = String(b);
  return s.length >= 4 ? `₹${s.slice(0, -3)},${s.slice(-3)}` : `₹${b}`;
});

const User = mongoose.model('User', userSchema);
export default User;
