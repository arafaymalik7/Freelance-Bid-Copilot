const crypto = require("crypto");
const { callGeminiEmbedding } = require("../utils/geminiClient");
const { buildSearchableText } = require("./knowledgeBaseService");

const FAKE_EMBEDDING_DIMENSIONS = 64;

function normalizeEmbeddingText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function l2Normalize(values) {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) {
    return values;
  }

  return values.map((value) => value / magnitude);
}

function createDeterministicTestEmbedding(text, dimensions = FAKE_EMBEDDING_DIMENSIONS) {
  const normalized = normalizeEmbeddingText(text);
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = normalized.split(" ").filter(Boolean);
  const inputTokens = tokens.length ? tokens : [normalized || "empty"];

  inputTokens.forEach((token) => {
    const digest = crypto.createHash("sha256").update(token).digest();
    const index = digest[0] % dimensions;
    const direction = digest[1] % 2 === 0 ? 1 : -1;
    const weight = 1 + (digest[2] % 5) / 10;
    vector[index] += direction * weight;
  });

  return l2Normalize(vector);
}

function isIndexBuildContext() {
  return process.env.BIDCOPILOT_INDEX_BUILD === "true";
}

function assertFakeEmbeddingsAllowed() {
  if (
    process.env.USE_FAKE_EMBEDDINGS === "true" &&
    process.env.NODE_ENV !== "test" &&
    !isIndexBuildContext()
  ) {
    throw new Error("USE_FAKE_EMBEDDINGS is only allowed during tests or npm run build:index");
  }
}

function shouldUseFakeEmbeddings() {
  assertFakeEmbeddingsAllowed();
  return process.env.NODE_ENV === "test" || (
    process.env.USE_FAKE_EMBEDDINGS === "true" && isIndexBuildContext()
  );
}

function validateEmbedding(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Embedding response must be a non-empty numeric array");
  }

  return values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

async function embedText(text) {
  const normalized = normalizeEmbeddingText(text);

  if (shouldUseFakeEmbeddings()) {
    return createDeterministicTestEmbedding(normalized);
  }

  return validateEmbedding(await callGeminiEmbedding(normalized));
}

async function embedKnowledgeEntry(entry) {
  return embedText(buildSearchableText(entry));
}

module.exports = {
  createDeterministicTestEmbedding,
  assertFakeEmbeddingsAllowed,
  embedKnowledgeEntry,
  embedText,
  isIndexBuildContext,
  normalizeEmbeddingText,
  shouldUseFakeEmbeddings,
  validateEmbedding,
};
