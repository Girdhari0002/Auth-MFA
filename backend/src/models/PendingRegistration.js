const mongoose = require("mongoose");

const pendingRegistrationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
  authenticatorSecret: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  mobileVerified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("PendingRegistration", pendingRegistrationSchema);
