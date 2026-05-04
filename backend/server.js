require("dotenv").config();

const { createApp } = require("./app");
const { prepareVectorIndex } = require("./services/vectorSearchService");
const { logInfo } = require("./utils/logger");

const app = createApp();
const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);

  if (process.env.GEMINI_API_KEY) {
    prepareVectorIndex({ persist: true }).catch((error) => {
      logInfo("index_build_error", { error: error.message });
    });
  }
});
