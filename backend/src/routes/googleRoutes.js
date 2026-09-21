const express = require("express");
const controller = require("../controllers/googleController");

const router = express.Router();
router.get("/google", controller.start);
router.get("/google/callback", controller.callback);
module.exports = router;
