const mongoose = require("mongoose");

const otpChallengeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  channel: { type: String, enum: ["email", "sms"], required: true },
  purpose: { type: String, enum: ["registration", "login"], required: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

otpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("OtpChallenge", otpChallengeSchema);
