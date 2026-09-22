const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { createOtpChallenge, verifyOtp } = require("../services/otpService");
const { jwtSecret } = require("../config/env");
const jwt = require("jsonwebtoken");
const { authenticator } = require("otplib");
const OtpChallenge = require("../models/OtpChallenge");

async function login(req, res) {
  const identifier = String(req.body?.identifier || "").trim().toLowerCase();
  const user = await User.findOne({ email: identifier }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(req.body?.password || "", user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password. Please try again." });
  }
  return res.json({
    mfaRequired: true,
    methods: [
      { id: "email", enabled: user.emailVerified },
      { id: "sms", enabled: user.mobileVerified },
      { id: "authenticator", enabled: user.mfaEnabled },
    ],
    identifier,
    phone: user.phone,
  });
}

async function verifyLoginOtp(req, res) {
  if (req.body?.method === "authenticator") {
    const user = await User.findOne({ email: String(req.body?.identifier || "").toLowerCase() }).select("+authenticatorSecret");
    const valid = user && /^\d{6}$/.test(String(req.body?.code || ""))
      ? { valid: authenticator.check(String(req.body.code), user.authenticatorSecret) }
      : { valid: false };
    if (!valid.valid) return res.status(400).json({ message: "Invalid authenticator code." });
    req.session.userId = user._id.toString();
    return res.json({ authenticated: true, user: { fullName: user.fullName, email: user.email } });
  }
  const challenge = await OtpChallenge.findById(req.body?.challengeId).select("channel");
  if (challenge && challenge.channel !== req.body?.method) return res.status(400).json({ message: "This verification method does not match the requested challenge." });
  const result = await verifyOtp(req.body?.challengeId, req.body?.code, "login");
  if (!result.ok) return res.status(result.status).json(result);
  const user = await User.findById(result.challenge.userId);
  req.session.userId = user._id.toString();
  return res.json({ authenticated: true, user: { fullName: user.fullName, email: user.email } });
}

async function sendLoginChallenge(req, res) {
  const identifier = String(req.body?.identifier || "").trim().toLowerCase();
  const channel = req.body?.method === "sms" ? "sms" : "email";
  const user = await User.findOne({ email: identifier });
  if (!user) return res.status(401).json({ message: "Account not found." });
  if ((channel === "email" && !user.emailVerified) || (channel === "sms" && !user.mobileVerified)) {
    return res.status(400).json({ message: "This verification method is not enabled." });
  }
  const challenge = await createOtpChallenge(user._id, channel, "login");
  return res.json({ challengeId: challenge._id, method: channel, expiresIn: 180 });
}

async function me(req, res) {
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(401).json({ message: "Not authenticated." });
  return res.json({ user: { fullName: user.fullName, email: user.email, mfaEnabled: user.mfaEnabled } });
}

async function logout(req, res) {
  req.session.destroy(() => res.json({ loggedOut: true }));
}

async function token(req, res) {
  const user = await User.findOne({ email: String(req.body?.identifier || "").toLowerCase() });
  if (!user) return res.status(401).json({ message: "Invalid credentials." });
  return res.json({ token: jwt.sign({ sub: user._id.toString(), email: user.email }, jwtSecret, { expiresIn: "10m" }) });
}

function protectedRoute(req, res) {
  const tokenValue = (req.headers.authorization || "").replace("Bearer ", "");
  try {
    const payload = jwt.verify(tokenValue, jwtSecret);
    return res.json({ message: "JWT protected response", subject: payload.sub });
  } catch {
    return res.status(401).json({ message: "A valid bearer token is required." });
  }
}

module.exports = { login, sendLoginChallenge, verifyLoginOtp, me, logout, token, protectedRoute };
