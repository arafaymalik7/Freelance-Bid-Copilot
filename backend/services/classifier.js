const { callGemini } = require("../utils/geminiClient");
const {
  assertArray,
  assertRequiredKeys,
  assertString,
  coerceNumber,
  createError,
} = require("../utils/validation");

const CATEGORIES = [
  "web_development",
  "mobile_app",
  "ui_ux_design",
  "content_writing",
  "data_analytics",
  "other",
];

const PRICING_UNITS = ["per_project", "per_hour", "per_word", "per_screen"];
const COMPLEXITY_SIGNALS = ["low", "medium", "high"];

function normalizeSubcategory(value, category) {
  const normalized =
    typeof value === "string" && value.trim()
      ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
      : "general";

  if (category === "web_development") {
    if (/(saas|web_app|webapp|dashboard|portal|tool|parser|ocr|document|extract|crm|workflow|admin_app|internal_app)/.test(normalized)) {
      return "saas_tool";
    }

    if (/(ecommerce|commerce|shop|store|checkout)/.test(normalized)) {
      return "ecommerce_store";
    }

    if (/(booking|appointment|calendar)/.test(normalized)) {
      return "booking_site";
    }

    if (/(membership|subscription|course|lms|gated)/.test(normalized)) {
      return "membership_site";
    }
  }

  if (category === "mobile_app") {
    if (/(game|gaming|unity|leaderboard)/.test(normalized)) {
      return "mobile_game";
    }

    if (/(social|feed|community|creator|media|photo|video)/.test(normalized)) {
      return "social_media_platform";
    }

    if (/(chat|messaging|message)/.test(normalized)) {
      return "chat_app";
    }
  }

  return normalized || "general";
}

const CLASSIFICATION_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: [
    "category",
    "subcategory",
    "complexity_signal",
    "confidence",
    "reasoning",
    "typical_stack",
    "pricing_unit",
  ],
  properties: {
    category: { type: "string", enum: CATEGORIES },
    subcategory: { type: "string" },
    complexity_signal: { type: "string", enum: COMPLEXITY_SIGNALS },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reasoning: { type: "string" },
    typical_stack: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    },
    pricing_unit: { type: "string", enum: PRICING_UNITS },
  },
};

function validateClassification(result) {
  assertRequiredKeys(result, [
    "category",
    "confidence",
    "reasoning",
    "typical_stack",
    "pricing_unit",
  ]);
  assertString(result.category, "category");
  assertString(result.reasoning, "reasoning");
  assertArray(result.typical_stack, "typical_stack");
  assertString(result.pricing_unit, "pricing_unit");

  const confidence = coerceNumber(result.confidence);
  if (confidence === null) {
    throw createError("Incomplete response from AI: missing confidence");
  }

  if (!CATEGORIES.includes(result.category)) {
    throw createError("Incomplete response from AI: missing category");
  }

  if (!PRICING_UNITS.includes(result.pricing_unit)) {
    throw createError("Incomplete response from AI: missing pricing_unit");
  }

  result.confidence = Math.max(0, Math.min(1, confidence));
  result.subcategory = normalizeSubcategory(result.subcategory, result.category);
  result.complexity_signal = COMPLEXITY_SIGNALS.includes(result.complexity_signal)
    ? result.complexity_signal
    : "medium";
  result.typical_stack = result.typical_stack
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim());

  return result;
}

async function classifyProject(brief) {
  const systemPrompt = `You are a project classifier for freelance work.
Analyze client briefs and return structured JSON that identifies the project category,
subcategory, complexity signal, confidence, reasoning, likely stack, and best pricing unit.`;

  const userMessage = `Classify this client brief into a project category.

Brief: "${brief}"

Respond with this exact JSON structure:
{
  "category": "<one of: web_development | mobile_app | ui_ux_design | content_writing | data_analytics | other>",
  "subcategory": "<short lowercase subcategory like ecommerce, saas_dashboard, mobile_mvp, landing_page, seo_articles>",
  "complexity_signal": "<low | medium | high>",
  "confidence": <number between 0.0 and 1.0>,
  "reasoning": "<one sentence explaining the classification>",
  "typical_stack": ["<technology 1>", "<technology 2>", "<technology 3>"],
  "pricing_unit": "<one of: per_project | per_hour | per_word | per_screen>"
}`;

  const result = await callGemini(systemPrompt, userMessage, CLASSIFICATION_SCHEMA);
  return validateClassification(result);
}

module.exports = { classifyProject, validateClassification, CATEGORIES, COMPLEXITY_SIGNALS, normalizeSubcategory };
