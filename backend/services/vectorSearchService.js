const fs = require("fs");
const path = require("path");
const { DEFAULT_EMBEDDING_MODEL } = require("../utils/geminiClient");
const { logInfo } = require("../utils/logger");
const { embedKnowledgeEntry, embedText, shouldUseFakeEmbeddings } = require("./embeddingService");
const { buildSearchableText, getAllKnowledgeEntries, getKnowledgeBaseHash } = require("./knowledgeBaseService");

const VECTOR_INDEX_PATH = path.join(__dirname, "..", "data", "vectorIndex.json");
const VECTOR_INDEX_META_PATH = path.join(__dirname, "..", "data", "vectorIndex.meta.json");
let preparationPromise = null;

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || right.length === 0) {
    return 0;
  }

  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    const leftValue = Number(left[index]);
    const rightValue = Number(right[index]);
    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
      continue;
    }

    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function loadVectorIndex() {
  if (!fs.existsSync(VECTOR_INDEX_PATH)) {
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(VECTOR_INDEX_PATH, "utf8"));
  if (Array.isArray(parsed)) {
    return parsed;
  }

  return Array.isArray(parsed.records) ? parsed.records : [];
}

function getActiveEmbeddingModel() {
  return process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
}

function buildIndexMetadata(index) {
  return {
    built_at: new Date().toISOString(),
    count: index.length,
    embedding_mode: shouldUseFakeEmbeddings() ? "fake" : "gemini",
    embedding_model: getActiveEmbeddingModel(),
    knowledge_hash: getKnowledgeBaseHash(),
  };
}

function readVectorIndexMetadata() {
  if (!fs.existsSync(VECTOR_INDEX_META_PATH)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(VECTOR_INDEX_META_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function saveVectorIndex(index) {
  fs.writeFileSync(VECTOR_INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  fs.writeFileSync(VECTOR_INDEX_META_PATH, `${JSON.stringify(buildIndexMetadata(index), null, 2)}\n`, "utf8");
}

function getVectorIndexStatus() {
  const index = loadVectorIndex();
  const metadata = readVectorIndexMetadata();
  const expectedMode = shouldUseFakeEmbeddings() ? "fake" : "gemini";
  const expectedModel = getActiveEmbeddingModel();
  const expectedHash = getKnowledgeBaseHash();
  const reasons = [];

  if (!index.length) {
    reasons.push("missing_index");
  }

  if (!metadata) {
    reasons.push("missing_metadata");
  } else {
    if (metadata.embedding_mode !== expectedMode) {
      reasons.push("embedding_mode_changed");
    }

    if (metadata.embedding_model !== expectedModel) {
      reasons.push("embedding_model_changed");
    }

    if (metadata.knowledge_hash !== expectedHash) {
      reasons.push("knowledge_changed");
    }

    if (metadata.count !== index.length) {
      reasons.push("count_mismatch");
    }
  }

  return {
    current: reasons.length === 0,
    index,
    metadata,
    reasons,
  };
}

function toVectorRecord(entry, embedding) {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    category: entry.category,
    subcategory: entry.subcategory || "general",
    source_file: entry.source_file,
    source_collection: entry.source_collection,
    search_text: buildSearchableText(entry),
    embedding,
    embedding_mode: shouldUseFakeEmbeddings() ? "fake" : "gemini",
    metadata: {
      scope_summary: entry.scope_summary,
      features: entry.features,
      typical_questions: entry.typical_questions || entry.questions,
      risk_flags: entry.risk_flags,
      price_range: entry.price_range,
      base_min: entry.base_min,
      base_max: entry.base_max,
      currency: entry.currency,
      complexity_multiplier: entry.complexity_multiplier,
      timeline_days: entry.timeline_days,
      complexity: entry.complexity,
      rule: entry.rule,
      pattern: entry.pattern,
      risk: entry.risk,
      guideline: entry.guideline,
      recommended_question: entry.recommended_question,
      recommendation: entry.recommendation,
      why_relevant: entry.why_relevant,
    },
  };
}

async function buildVectorIndex({ persist = false } = {}) {
  const entries = getAllKnowledgeEntries();
  const index = [];

  for (const entry of entries) {
    const embedding = await embedKnowledgeEntry(entry);
    index.push(toVectorRecord(entry, embedding));
  }

  if (persist) {
    saveVectorIndex(index);
  }

  return index;
}

async function prepareVectorIndex({ force = false, persist = true } = {}) {
  if (preparationPromise) {
    return preparationPromise;
  }

  preparationPromise = (async () => {
    const status = getVectorIndexStatus();

    if (!force && status.current) {
      logInfo("index_ready", {
        count: status.index.length,
        embedding_mode: status.metadata.embedding_mode,
        embedding_model: status.metadata.embedding_model,
      });
      return status.index;
    }

    logInfo("index_stale", {
      reasons: status.reasons,
      existing_count: status.index.length,
      embedding_mode: shouldUseFakeEmbeddings() ? "fake" : "gemini",
      embedding_model: getActiveEmbeddingModel(),
    });
    logInfo("index_build_start", {
      persist,
      embedding_mode: shouldUseFakeEmbeddings() ? "fake" : "gemini",
      embedding_model: getActiveEmbeddingModel(),
    });

    const startedAt = Date.now();
    const index = await buildVectorIndex({ persist });
    logInfo("index_build_end", {
      count: index.length,
      duration_ms: Date.now() - startedAt,
      persisted: persist,
    });
    return index;
  })();

  try {
    return await preparationPromise;
  } finally {
    preparationPromise = null;
  }
}

async function getOrBuildVectorIndex() {
  return prepareVectorIndex({
    persist: process.env.NODE_ENV !== "test",
  });
}

function matchesFilters(item, filters) {
  const { category, subcategory, types } = filters;
  const typeList = Array.isArray(types) ? types : types ? [types] : [];

  if (category && category !== "other" && item.category !== category && item.category !== "all") {
    return false;
  }

  if (subcategory && item.subcategory !== subcategory) {
    return false;
  }

  if (typeList.length && !typeList.includes(item.type)) {
    return false;
  }

  return true;
}

async function searchVectorIndex(query, options = {}) {
  const topK = Math.max(1, Math.min(Number(options.topK) || 5, 20));
  const index = options.index || (await getOrBuildVectorIndex());
  const queryEmbedding = Array.isArray(query) ? query : await embedText(query);

  return index
    .filter((item) => matchesFilters(item, options))
    .map((item) => ({
      ...item,
      similarity: Number(cosineSimilarity(queryEmbedding, item.embedding).toFixed(4)),
    }))
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, topK);
}

module.exports = {
  VECTOR_INDEX_PATH,
  VECTOR_INDEX_META_PATH,
  buildVectorIndex,
  cosineSimilarity,
  getActiveEmbeddingModel,
  getOrBuildVectorIndex,
  getVectorIndexStatus,
  loadVectorIndex,
  prepareVectorIndex,
  readVectorIndexMetadata,
  saveVectorIndex,
  searchVectorIndex,
};
