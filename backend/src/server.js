const { createApp } = require("./app");
const { connectDatabase } = require("./config/database");
const { port } = require("./config/env");

connectDatabase()
  .then(() => createApp().listen(port, () => console.log(`SecureID running at http://localhost:${port}`)))
  .catch((error) => {
    console.error(`Database startup failed: ${error.message}`);
    process.exit(1);
  });
