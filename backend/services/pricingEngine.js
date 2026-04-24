const { callGemini } = require("../utils/geminiClient");
const { assertRequiredKeys, assertString, coerceNumber, createError, ensurePricingTierOrder } = require("../utils/validation");

const PRICING_TIER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["min", "max", "includes", "timeline"],
  properties: {
    min: { type: "number", minimum: 0 },
    max: { type: "number", minimum: 0 },
    includes: { type: "string" },
    timeline: { type: "string" },
  },
};

const PRICING_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: [
    "currency",
    "basic",
    "recommended",
    "premium",
    "hourly_equivalent",
    "pricing_notes",
  ],
  properties: {
    currency: { type: "string" },
    basic: PRICING_TIER_SCHEMA,
    recommended: PRICING_TIER_SCHEMA,
    premium: PRICING_TIER_SCHEMA,
    hourly_equivalent: { type: "number", minimum: 0 },
    pricing_notes: { type: "array", items: { type: "string" } },
  },
};

function validateTier(tier, fieldName) {
  assertRequiredKeys({ [fieldName]: tier }, [`${fieldName}.min`, `${fieldName}.max`, `${fieldName}.includes`, `${fieldName}.timeline`]);
  assertString(tier.includes, `${fieldName}.includes`);
  assertString(tier.timeline, `${fieldName}.timeline`);
}

function validatePricing(result) {
  assertRequiredKeys(result, ["basic.min", "recommended.min", "premium.min"]);
  validateTier(result.basic, "basic");
  validateTier(result.recommended, "recommended");
  validateTier(result.premium, "premium");

  result.hourly_equivalent = coerceNumber(result.hourly_equivalent);
  if (result.hourly_equivalent === null) {
    throw createError("Incomplete response from AI: missing hourly_equivalent");
  }

  result.pricing_notes = Array.isArray(result.pricing_notes)
    ? result.pricing_notes.filter((note) => typeof note === "string" && note.trim()).map((note) => note.trim())
    : [];

  ensurePricingTierOrder(result);
  return result;
}

async function suggestPricing(brief, category, extraction, scope) {
  const systemPrompt = `You are a freelance pricing consultant.
Suggest realistic USD pricing based on complexity, scope, delivery effort, and revision burden.`;

  const userMessage = `Suggest pricing bands for this freelance project.
Use realistic USD market rates for a competent freelancer.

Category: ${category}
Project size: ${extraction.project_size}
Total estimated days: ${scope.total_estimated_days}
Scope summary: ${scope.project_summary}
Key deliverables: ${scope.in_scope.join(", ")}
Original brief: "${brief}"

Respond with this exact JSON:
{
  "currency": "USD",
  "basic": {
    "min": <number>,
    "max": <number>,
    "includes": "<what is included at this level>",
    "timeline": "<e.g. 3-4 weeks>"
  },
  "recommended": {
    "min": <number>,
    "max": <number>,
    "includes": "<what is included at this level>",
    "timeline": "<e.g. 4-6 weeks>"
  },
  "premium": {
    "min": <number>,
    "max": <number>,
    "includes": "<what is included at this level>",
    "timeline": "<e.g. 2-3 weeks rush>"
  },
  "hourly_equivalent": <number>,
  "pricing_notes": [
    "<note 1 about scope creep or negotiation>",
    "<note 2 about what could increase the price>",
    "<note 3 about payment protection>"
  ]
}`;

  const result = await callGemini(systemPrompt, userMessage, PRICING_SCHEMA);
  return validatePricing(result);
}

module.exports = { suggestPricing, validatePricing };

