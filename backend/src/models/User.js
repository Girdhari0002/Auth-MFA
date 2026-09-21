const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true, index: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  mobileVerified: { type: Boolean, default: false },
  mfaEnabled: { type: Boolean, default: false },
  authenticatorSecret: { type: String, select: false },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
