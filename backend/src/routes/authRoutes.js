const express = require("express");
const controller = require("../controllers/authController");

const router = express.Router();
router.post("/login", controller.login);
router.post("/login/challenge", controller.sendLoginChallenge);
router.post("/verify-login-otp", controller.verifyLoginOtp);
router.get("/me", controller.me);
router.post("/logout", controller.logout);
router.post("/token", controller.token);
router.get("/protected", controller.protectedRoute);
module.exports = router;
