const mongoose = require("mongoose");
const { mongoUri } = require("./env");

async function connectDatabase() {
  if (!mongoUri) throw new Error("MONGODB_URI is required. Copy .env.example to .env and configure it.");
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
}

module.exports = { connectDatabase };
