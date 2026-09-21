const crypto = require("crypto");
const OtpChallenge = require("../models/OtpChallenge");
const User = require("../models/User");
const PendingRegistration = require("../models/PendingRegistration");
const { sendEmailOtp, sendSmsOtp } = require("./deliveryService");
const { otpExpiryMs, otpMaxAttempts } = require("../config/env");

function generateOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

async function createOtpChallenge(userId, channel, purpose = "registration") {
  const otp = generateOtp();
  const challenge = await OtpChallenge.create({
    userId,
    channel,
    purpose,
    otpHash: crypto.createHash("sha256").update(otp).digest("hex"),
    expiresAt: new Date(Date.now() + otpExpiryMs),
  });
  const user = await User.findById(userId).select("email phone");
  const pending = user || await PendingRegistration.findById(userId).select("email phone");
  if (!pending) {
    await OtpChallenge.findByIdAndDelete(challenge._id);
    const error = new Error("Registration session not found.");
    error.status = 404;
    throw error;
  }
  try {
    if (channel === "email") await sendEmailOtp(pending.email, otp);
    else await sendSmsOtp(pending.phone, otp);
  } catch (error) {
    await OtpChallenge.findByIdAndDelete(challenge._id);
    throw error;
  }
  return challenge;
}

async function verifyOtp(challengeId, code, purpose) {
  const challenge = await OtpChallenge.findById(challengeId);
  if (!challenge || challenge.purpose !== purpose || challenge.used) {
    return { ok: false, status: 404, message: "Verification code not found." };
  }
  if (challenge.expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 410, message: "This code has expired.", expired: true };
  }
  if (challenge.attempts >= otpMaxAttempts) {
    return { ok: false, status: 429, message: "Maximum attempts reached. Request a new code.", locked: true };
  }
  challenge.attempts += 1;
  const hash = crypto.createHash("sha256").update(String(code || "")).digest("hex");
  if (hash !== challenge.otpHash) {
    await challenge.save();
    const remaining = Math.max(0, otpMaxAttempts - challenge.attempts);
    return { ok: false, status: 400, message: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.` };
  }
  challenge.used = true;
  await challenge.save();
  return { ok: true, challenge };
}

module.exports = { createOtpChallenge, verifyOtp };
