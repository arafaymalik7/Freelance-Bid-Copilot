const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
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
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });

  return parseJson(extractResponseText(response));
}

async function callGemini(systemPrompt, userMessage, responseSchema) {
  try {
    return await runRequest(systemPrompt, userMessage, responseSchema);
  } catch (error) {
    if (!shouldRetry(error)) {
      throw error;
    }

    await sleep(3000);

    try {
      return await runRequest(systemPrompt, userMessage, responseSchema);
    } catch (_retryError) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }
  }
}

module.exports = { callGemini, DEFAULT_MODEL, RATE_LIMIT_MESSAGE };
