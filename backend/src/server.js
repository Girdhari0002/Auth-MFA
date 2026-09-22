const { createApp } = require("./app");
const { connectDatabase } = require("./config/database");
const { port } = require("./config/env");

const app = createApp();

let dbConnected = false;

async function handler(req, res) {
  try {
    if (!dbConnected) {
      await connectDatabase();
      dbConnected = true;
    }

    return app(req, res);
  } catch (error) {
    console.error("Database connection failed:", error);

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
}

// Local development
if (process.env.VERCEL !== "1") {
  connectDatabase()
    .then(() => {
      const server = app.listen(port, () => {
        console.log(`SecureID running at http://localhost:${port}`);
      });

      server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          console.error(
            `Port ${port} is already in use. Stop the existing server or set a different PORT in .env.`
          );
        } else {
          console.error(`Server startup failed: ${error.message}`);
        }

        process.exit(1);
      });
    })
    .catch((error) => {
      console.error(`Database startup failed: ${error.message}`);
      process.exit(1);
    });
}

// Vercel serverless handler
module.exports = handler;