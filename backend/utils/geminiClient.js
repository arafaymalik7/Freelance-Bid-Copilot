const { GoogleGenAI } = require("@google/genai");
const { logDebug, logInfo } = require("./logger");
require("dotenv").config({ quiet: true });

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const DEFAULT_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const RATE_LIMIT_MESSAGE = "API rate limit hit. Please wait a moment and try again.";

let client;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return client;
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function shouldRetry(error) {
  const rawMessage = `${error?.message || ""} ${error?.status || ""}`.toLowerCase();
  return (
    rawMessage.includes("429") ||
    rawMessage.includes("503") ||
    rawMessage.includes("quota") ||
    rawMessage.includes("overloaded") ||
    rawMessage.includes("unavailable") ||
    rawMessage.includes("high demand")
  );
}

function isModelNotFound(error) {
  const rawMessage = `${error?.message || ""} ${error?.status || ""}`.toLowerCase();
  return rawMessage.includes("404") && rawMessage.includes("not found");
}

function extractResponseText(response) {
  if (typeof response?.text === "string" && response.text.trim()) {
    return response.text;
  }

  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const text = parts
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new Error("Gemini returned an empty response");
}

function parseJson(rawText) {
  try {
    return JSON.parse(rawText);
  } catch (parseError) {
    const objectMatch = rawText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error(`Gemini returned non-JSON response. Raw: ${rawText.slice(0, 200)}`);
  }
}

async function runRequest(systemPrompt, userMessage, responseSchema) {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const startedAt = Date.now();
  logInfo("gemini_generate_start", { model });
  const response = await ai.models.generateContent({
    model,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });

  const parsed = parseJson(extractResponseText(response));
  logInfo("gemini_generate_end", { model, duration_ms: Date.now() - startedAt });
  return parsed;
}

function extractEmbeddingValues(response) {
  const values = response?.embeddings?.[0]?.values || response?.embedding?.values || response?.values;

  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Gemini returned an empty embedding response");
  }

  return values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

async function runEmbeddingRequest(text) {
  const ai = getClient();
  const model = process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const startedAt = Date.now();
  logDebug("gemini_embedding_start", { model, input_chars: String(text || "").length });
  const response = await ai.models.embedContent({
    model,
    contents: text,
  });

  const values = extractEmbeddingValues(response);
  if (values.length === 0) {
    throw new Error("Gemini returned an invalid embedding response");
  }

  logDebug("gemini_embedding_end", {
    model,
    duration_ms: Date.now() - startedAt,
    dimensions: values.length,
  });
  return values;
}

async function callGemini(systemPrompt, userMessage, responseSchema) {
  try {
    return await runRequest(systemPrompt, userMessage, responseSchema);
  } catch (error) {
    if (!shouldRetry(error)) {
      throw error;
    }

    logInfo("gemini_generate_retry", { model: process.env.GEMINI_MODEL || DEFAULT_MODEL });
    await sleep(3000);

    try {
      return await runRequest(systemPrompt, userMessage, responseSchema);
    } catch (_retryError) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }
  }
}

async function callGeminiEmbedding(text) {
  try {
    return await runEmbeddingRequest(text);
  } catch (error) {
    const model = process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;

    if (isModelNotFound(error)) {
      throw new Error(
        `Gemini embedding model "${model}" is not available for embedContent. Set GEMINI_EMBEDDING_MODEL=gemini-embedding-001.`,
      );
    }

    if (!shouldRetry(error)) {
      throw error;
    }

    logInfo("gemini_embedding_retry", {
      model,
    });
    await sleep(3000);

    try {
      return await runEmbeddingRequest(text);
    } catch (_retryError) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }
  }
}

module.exports = {
  callGemini,
  callGeminiEmbedding,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_MODEL,
  RATE_LIMIT_MESSAGE,
  isModelNotFound,
};
