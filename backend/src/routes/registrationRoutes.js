const express = require("express");
const controller = require("../controllers/registrationController");

const router = express.Router();
router.post("/register", controller.register);
router.post("/verify-email-otp", controller.verifyEmail);
router.post("/verify-sms-otp", controller.verifyMobile);
router.post("/setup-mfa", controller.setupMfa);
router.post("/verify-mfa", controller.verifyMfa);
module.exports = router;
