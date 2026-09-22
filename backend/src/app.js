const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const registrationRoutes = require("./routes/registrationRoutes");
const authRoutes = require("./routes/authRoutes");
const googleRoutes = require("./routes/googleRoutes");

const { sessionSecret, mongoUri } = require("./config/env");

function createApp() {
  const app = express();

  // CORS
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://girdhari-o036jss05-girdhari-singh-yadavs-projects.vercel.app",
    ...(process.env.FRONTEND_URLS || "").split(","),
    process.env.FRONTEND_URL,
  ].map((origin) => origin.trim()).filter(Boolean);

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });

  // Body parser
  app.use(express.json());

  // Session
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,

      store: MongoStore.create({
        mongoUrl: mongoUri,
        collectionName: "sessions",
      }),

      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 3600000,
      },
    })
  );

  // Health check
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "SecureID backend is running",
    });
  });

  // API routes
  app.use("/api", registrationRoutes);
  app.use("/api", authRoutes);
  app.use("/api/auth", googleRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: "API route not found",
      path: req.originalUrl,
    });
  });

  // Error handler
  app.use((error, req, res, next) => {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  });

  return app;
}

module.exports = { createApp };