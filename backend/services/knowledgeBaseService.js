const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createError } = require("../utils/validation");

const KNOWLEDGE_DIR = path.join(__dirname, "..", "data", "knowledge");

const KNOWLEDGE_FILES = {
  projectCases: "projectCases.json",
  pricingRules: "pricingRules.json",
  scopeRules: "scopeRules.json",
  riskPatterns: "riskPatterns.json",
  proposalPatterns: "proposalPatterns.json",
  questionTemplates: "questionTemplates.json",
};

const REQUIRED_COMMON_FIELDS = ["id", "type", "category"];

function readJsonFile(fileName) {
  const filePath = path.join(KNOWLEDGE_DIR, fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadKnowledgeBase() {
  return Object.entries(KNOWLEDGE_FILES).reduce((base, [key, fileName]) => {
    base[key] = readJsonFile(fileName);
    return base;
  }, {});
}

function flattenText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(flattenText).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value).map(flattenText).filter(Boolean).join(" ");
  }

  return String(value);
}

function buildSearchableText(entry) {
  return [
    entry.title,
    entry.category,
    entry.subcategory,
    entry.brief_example,
    entry.scope_summary,
    entry.rule,
    entry.pattern,
    entry.risk,
    entry.guideline,
    entry.question,
    entry.recommended_question,
    flattenText(entry.features),
    flattenText(entry.typical_questions),
    flattenText(entry.risk_flags),
    flattenText(entry.price_range),
    flattenText(entry.base_min),
    flattenText(entry.base_max),
    flattenText(entry.complexity_multiplier),
    flattenText(entry.timeline_days),
    flattenText(entry.applies_when),
    flattenText(entry.recommendation),
    flattenText(entry.questions),
    entry.why_relevant,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function validateKnowledgeEntry(entry, sourceName) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw createError(`${sourceName} contains a non-object knowledge entry`);
  }

  REQUIRED_COMMON_FIELDS.forEach((field) => {
    if (typeof entry[field] !== "string" || !entry[field].trim()) {
      throw createError(`${sourceName}:${entry.id || "unknown"} is missing ${field}`);
    }
  });

  if (!buildSearchableText(entry)) {
    throw createError(`${sourceName}:${entry.id} has no searchable text`);
  }

  if (entry.type === "project_case") {
    if (!entry.subcategory || !entry.scope_summary || !entry.price_range) {
      throw createError(`${sourceName}:${entry.id} project case is missing RAG fields`);
    }
  }

  return true;
}

function validateKnowledgeBase() {
  const base = loadKnowledgeBase();
  const counts = {};
  let totalEntries = 0;

  Object.entries(base).forEach(([sourceName, entries]) => {
    if (!Array.isArray(entries)) {
      throw createError(`${sourceName} must be an array`);
    }

    const seenIds = new Set();
    entries.forEach((entry) => {
      validateKnowledgeEntry(entry, sourceName);
      if (seenIds.has(entry.id)) {
        throw createError(`${sourceName}:${entry.id} is duplicated`);
      }
      seenIds.add(entry.id);
    });

    counts[sourceName] = entries.length;
    totalEntries += entries.length;
  });

  return { counts, totalEntries };
}

function getAllKnowledgeEntries() {
  const base = loadKnowledgeBase();

  return Object.entries(base).flatMap(([sourceName, entries]) =>
    entries.map((entry) => ({
      ...entry,
      title:
        entry.title ||
        entry.rule ||
        entry.guideline ||
        entry.risk ||
        entry.question ||
        entry.pattern ||
        entry.id,
      source_file: KNOWLEDGE_FILES[sourceName],
      source_collection: sourceName,
    })),
  );
}

function getKnowledgeBaseHash() {
  const entries = getAllKnowledgeEntries()
    .map((entry) => ({
      id: entry.id,
      text: buildSearchableText(entry),
      type: entry.type,
      category: entry.category,
      subcategory: entry.subcategory || "general",
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(entries))
    .digest("hex");
}

module.exports = {
  buildSearchableText,
  getAllKnowledgeEntries,
  getKnowledgeBaseHash,
  loadKnowledgeBase,
  validateKnowledgeBase,
  validateKnowledgeEntry,
};
