const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  
    admin_id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'support_agent'],
      default: 'super_admin',
    },
    is_active: { type: Boolean, default: true },
    last_login: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', AdminSchema);