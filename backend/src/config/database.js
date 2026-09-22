const mongoose = require("mongoose");
const { mongoUri } = require("./env");

let connectionPromise;

async function connectDatabase() {
  if (!mongoUri) throw new Error("MONGODB_URI is required. Copy .env.example to .env and configure it.");
  if (mongoose.connection.readyState === 1) return;
  connectionPromise ??= mongoose.connect(mongoUri);
  try {
    await connectionPromise;
    console.log("MongoDB connected");
  } catch (error) {
    connectionPromise = undefined;
    throw error;
  }
}

module.exports = { connectDatabase };
