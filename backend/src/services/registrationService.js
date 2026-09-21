const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PendingRegistration = require("../models/PendingRegistration");
const { createOtpChallenge, verifyOtp } = require("./otpService");
const QRCode = require("qrcode");
const { verifySync } = require("otplib");

function toBase32(buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) {
    output += alphabet[parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }
  return output;
}

function validPassword(password) {
  return typeof password === "string" && password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

async function register({ fullName, email, phone, password }) {
  if (!fullName || !/^\S+@\S+\.\S+$/.test(email || "") || !phone || !validPassword(password)) {
    const error = new Error("Please complete every field and use a stronger password.");
    error.status = 400;
    throw error;
  }
  const normalizedEmail = email.toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    const error = new Error("An account with this email already exists.");
    error.status = 409;
    throw error;
  }
  const existingPending = await PendingRegistration.findOne({ email: normalizedEmail });
  if (existingPending) {
    await Promise.all([
      PendingRegistration.findByIdAndDelete(existingPending._id),
      require("../models/OtpChallenge").deleteMany({ userId: existingPending._id }),
    ]);
  }
  const secret = toBase32(crypto.randomBytes(20));
  const pending = await PendingRegistration.create({
    fullName, email: normalizedEmail, phone, passwordHash: await bcrypt.hash(password, 12),
    authenticatorSecret: secret, expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });
  const challenge = await createOtpChallenge(pending._id, "email");
  return { pendingId: pending._id, challengeId: challenge._id, channel: "email", expiresIn: 180 };
}

async function verifyEmail(challengeId, code) {
  const result = await verifyOtp(challengeId, code, "registration");
  if (!result.ok) return result;
  const pending = await PendingRegistration.findById(result.challenge.userId);
  if (!pending) return { ok: false, status: 404, message: "Registration session not found." };
  let next;
  try {
    next = await createOtpChallenge(pending._id, "sms");
  } catch (error) {
    result.challenge.used = false;
    result.challenge.attempts = Math.max(0, result.challenge.attempts - 1);
    await result.challenge.save();
    throw error;
  }
  pending.emailVerified = true;
  await pending.save();
  return { ok: true, pendingId: pending._id, challengeId: next._id, channel: "sms", expiresIn: 180 };
}

async function verifyMobile(challengeId, code) {
  const result = await verifyOtp(challengeId, code, "registration");
  if (!result.ok) return result;
  const pending = await PendingRegistration.findByIdAndUpdate(result.challenge.userId, { mobileVerified: true }, { new: true });
  return pending ? { ok: true, pending } : { ok: false, status: 404, message: "Registration session not found." };
}

async function setupAuthenticator(pendingId) {
  const pending = await PendingRegistration.findById(pendingId);
  if (!pending || !pending.emailVerified || !pending.mobileVerified) return null;
  const label = encodeURIComponent(`SecureID:${pending.email}`);
  const issuer = encodeURIComponent("SecureID");
  const setupUri = `otpauth://totp/${label}?secret=${pending.authenticatorSecret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  return { setupUri, qrDataUrl: await QRCode.toDataURL(setupUri, { errorCorrectionLevel: "M", margin: 2, width: 220 }), pending };
}

async function verifyAuthenticator(pendingId, code) {
  const pending = await PendingRegistration.findById(pendingId);
  if (!pending || !pending.emailVerified || !pending.mobileVerified) return { ok: false, status: 404, message: "Registration session not found." };
  const totpResult = /^\d{6}$/.test(String(code || ""))
    ? verifySync({ token: String(code), secret: pending.authenticatorSecret })
    : { valid: false };
  if (!totpResult.valid) {
    return { ok: false, status: 400, message: "Invalid authenticator code." };
  }
  const user = await User.create({
    fullName: pending.fullName, email: pending.email, phone: pending.phone,
    passwordHash: pending.passwordHash, emailVerified: true, mobileVerified: true,
    mfaEnabled: true, authenticatorSecret: pending.authenticatorSecret,
  });
  await pending.deleteOne();
  return { ok: true, user };
}

module.exports = { register, verifyEmail, verifyMobile, setupAuthenticator, verifyAuthenticator, validPassword };
