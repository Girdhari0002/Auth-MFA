const crypto = require("crypto");
const User = require("../models/User");
const { googleClientId, googleClientSecret, googleCallbackUrl, frontendUrl } = require("../config/env");

function configurationError(res) {
  return res.status(503).send("Google sign-in is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL.");
}

function start(req, res) {
  if (!googleClientId || !googleClientSecret || !googleCallbackUrl) return configurationError(res);
  const state = crypto.randomBytes(24).toString("hex");
  req.session.googleOAuthState = state;
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: googleCallbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

async function callback(req, res) {
  try {
    if (!googleClientId || !googleClientSecret || !googleCallbackUrl) return configurationError(res);
    if (!req.query.state || req.query.state !== req.session.googleOAuthState) return res.status(400).send("Invalid Google OAuth state.");
    delete req.session.googleOAuthState;
    if (req.query.error) return res.redirect(`${frontendUrl}?googleError=${encodeURIComponent(req.query.error)}`);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: req.query.code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: googleCallbackUrl,
      grant_type: "authorization_code",
    }),
    });
    if (!tokenResponse.ok) return res.status(401).send("Google authorization failed.");
    const tokens = await tokenResponse.json();
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileResponse.ok) return res.status(401).send("Unable to read Google profile.");
    const profile = await profileResponse.json();
    if (!profile.email || !profile.email_verified) return res.status(400).send("A verified Google email is required.");

    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email: profile.email.toLowerCase() }] });
    if (!user) {
      user = await User.create({
        googleId: profile.sub,
        fullName: profile.name || profile.email.split("@")[0],
        email: profile.email,
        phone: "google-account",
        passwordHash: crypto.randomBytes(32).toString("hex"),
        emailVerified: true,
      });
    } else if (!user.googleId) {
      user.googleId = profile.sub;
      user.emailVerified = true;
      await user.save();
    }
    req.session.userId = user._id.toString();
    return res.redirect(`${frontendUrl}?googleLogin=success`);
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return res.status(502).send("Google sign-in could not be completed.");
  }
}

module.exports = { start, callback };
