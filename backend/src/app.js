const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
const registrationRoutes = require("./routes/registrationRoutes");
const authRoutes = require("./routes/authRoutes");
const googleRoutes = require("./routes/googleRoutes");
const { sessionSecret } = require("./config/env");

function createApp() {
  const app = express();
  const frontendPath = path.join(__dirname, "..", "..", "frontend");
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (/^http:\/\/localhost:\d+$/.test(origin || "")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  app.use(express.json());
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: require("./config/env").mongoUri, collectionName: "sessions" }),
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 3600000 },
  }));
  app.use(express.static(frontendPath));
  app.use("/api", registrationRoutes);
  app.use("/api", authRoutes);
  app.use("/api/auth", googleRoutes);
  app.get("*", (_req, res) => res.sendFile(path.join(frontendPath, "index.html")));
  return app;
}

module.exports = { createApp };
