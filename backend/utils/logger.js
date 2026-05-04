function getLogLevel() {
  if (process.env.BIDCOPILOT_LOG_LEVEL) {
    return process.env.BIDCOPILOT_LOG_LEVEL;
  }

  return process.env.NODE_ENV === "test" ? "silent" : "info";
}

function shouldLog() {
  return getLogLevel() !== "silent";
}

function shouldDebugLog() {
  return getLogLevel() === "debug";
}

const SENSITIVE_KEYS = new Set([
  "api_key",
  "apikey",
  "answer",
  "answers",
  "brief",
  "client_reply",
  "contents",
  "generated_text",
  "prompt",
  "proposal",
  "proposal_draft",
  "proposaldraft",
  "question",
  "questions",
  "raw_response",
  "rawresponse",
  "response",
  "system_prompt",
  "systemprompt",
  "user_message",
  "usermessage",
  "user_answers",
  "useranswers",
]);

function isSensitiveKey(key) {
  return SENSITIVE_KEYS.has(String(key || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase());
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return sanitizeDetails(value);
  }

  return value;
}

function sanitizeDetails(details = {}) {
  return Object.fromEntries(
    Object.entries(details)
      .filter(([key, value]) => !isSensitiveKey(key) && value !== undefined && value !== null)
      .map(([key, value]) => [key, sanitizeValue(value)]),
  );
}

function logInfo(event, details = {}) {
  if (!shouldLog()) {
    return;
  }

  console.log(`[bidcopilot] ${event}`, JSON.stringify({
    timestamp: new Date().toISOString(),
    ...sanitizeDetails(details),
  }));
}

function logDebug(event, details = {}) {
  if (!shouldDebugLog()) {
    return;
  }

  console.log(`[bidcopilot] ${event}`, JSON.stringify({
    timestamp: new Date().toISOString(),
    ...sanitizeDetails(details),
  }));
}

async function logStage(requestId, stage, handler, details = {}) {
  const startedAt = Date.now();
  logInfo("stage_start", { request_id: requestId, stage, ...details });

  try {
    const result = await handler();
    logInfo("stage_end", {
      request_id: requestId,
      stage,
      duration_ms: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logInfo("stage_error", {
      request_id: requestId,
      stage,
      duration_ms: Date.now() - startedAt,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  getLogLevel,
  logDebug,
  logInfo,
  logStage,
  sanitizeDetails,
  shouldLog,
};
