const express = require("express");
const cors = require("cors");
const pipelineRouter = require("./routes/pipeline");
const workspaceRouter = require("./routes/workspace");
const feedbackRouter = require("./routes/feedback");
const knowledgeRouter = require("./routes/knowledge");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api", pipelineRouter);
  app.use("/api/workspace", workspaceRouter);
  app.use("/api/feedback", feedbackRouter);
  app.use("/api/knowledge", knowledgeRouter);

  app.use((err, _req, res, _next) => {
    const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
    const message = err.publicMessage || "Something went wrong";

    console.error("Unhandled error:", err.message);
    res.status(status).json({ error: message, detail: err.message });
  });

  return app;
}

module.exports = { createApp };
