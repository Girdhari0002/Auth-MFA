const registrationService = require("../services/registrationService");

function sendError(res, error) {
  if (!error.status) console.error(error);
  return res.status(error.status || 500).json({
    message: error.status ? error.message : "Unexpected server error. Check the backend logs.",
  });
}

async function register(req, res) {
  try { return res.status(201).json(await registrationService.register(req.body || {})); } catch (error) { return sendError(res, error); }
}

async function verifyEmail(req, res) {
  try {
    const result = await registrationService.verifyEmail(req.body?.challengeId, req.body?.code);
    if (!result.ok) return res.status(result.status).json(result);
    return res.json(result);
  } catch (error) { return sendError(res, error); }
}

async function verifyMobile(req, res) {
  try {
    const result = await registrationService.verifyMobile(req.body?.challengeId, req.body?.code);
    if (!result.ok) return res.status(result.status).json(result);
    return res.json({ pendingId: result.pending._id, user: { fullName: result.pending.fullName, email: result.pending.email }, mobileVerified: true, mfaRequired: true });
  } catch (error) { return sendError(res, error); }
}

async function setupMfa(req, res) {
  try {
    const result = await registrationService.setupAuthenticator(req.body?.pendingId);
    if (!result) return res.status(404).json({ message: "Account not found." });
    return res.json({ setupUri: result.setupUri, qrDataUrl: result.qrDataUrl, mfaSetup: true });
  } catch (error) { return sendError(res, error); }
}

async function verifyMfa(req, res) {
  try {
    const result = await registrationService.verifyAuthenticator(req.body?.pendingId, req.body?.code);
    if (!result.ok) return res.status(result.status).json(result);
    return res.json({ user: { fullName: result.user.fullName, email: result.user.email }, mfaEnabled: true });
  } catch (error) { return sendError(res, error); }
}

module.exports = { register, verifyEmail, verifyMobile, setupMfa, verifyMfa };
