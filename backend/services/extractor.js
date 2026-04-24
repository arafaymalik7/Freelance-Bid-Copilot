const { callGemini } = require("../utils/geminiClient");
const { assertArray, assertRequiredKeys, assertString, createError } = require("../utils/validation");

const CATEGORY_HINTS = {
  web_development:
    "Pay attention to number of pages, CMS needs, ecommerce features, hosting, and responsiveness.",
  mobile_app:
    "Pay attention to iOS or Android support, authentication, APIs, notifications, and offline needs.",
  ui_ux_design:
    "Pay attention to number of screens, design system needs, deliverables, prototypes, and research.",
  content_writing:
    "Pay attention to volume, word count, tone, SEO, research depth, and publishing cadence.",
  data_analytics:
    "Pay attention to data sources, dashboards, visualizations, reporting cadence, and tooling.",
  other: "Pay attention to the main deliverable, timeline, dependencies, and hidden assumptions.",
};

const EXTRACTION_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: [
    "main_deliverable",
    "features",
    "deadline_hint",
    "budget_hint",
    "technical_requirements",
    "assumptions",
    "client_experience_level",
    "project_size",
  ],
  properties: {
    main_deliverable: { type: "string" },
    features: { type: "array", items: { type: "string" } },
    deadline_hint: { type: ["string", "null"] },
    budget_hint: { type: ["string", "null"] },
    technical_requirements: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    client_experience_level: {
      type: "string",
      enum: ["beginner", "intermediate", "expert"],
    },
    project_size: { type: "string", enum: ["small", "medium", "large"] },
  },
};

function cleanStringArray(arrayValue) {
  return arrayValue.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
}

function validateExtraction(result) {
  assertRequiredKeys(result, ["main_deliverable", "features"]);
  assertString(result.main_deliverable, "main_deliverable");
  assertArray(result.features, "features");
  assertArray(result.technical_requirements, "technical_requirements");
  assertArray(result.assumptions, "assumptions");

  if (!["beginner", "intermediate", "expert"].includes(result.client_experience_level)) {
    throw createError("Incomplete response from AI: missing client_experience_level");
  }

  if (!["small", "medium", "large"].includes(result.project_size)) {
    throw createError("Incomplete response from AI: missing project_size");
  }

  return {
    main_deliverable: result.main_deliverable.trim(),
    features: cleanStringArray(result.features),
    deadline_hint: typeof result.deadline_hint === "string" ? result.deadline_hint.trim() : null,
    budget_hint: typeof result.budget_hint === "string" ? result.budget_hint.trim() : null,
    technical_requirements: cleanStringArray(result.technical_requirements),
    assumptions: cleanStringArray(result.assumptions),
    client_experience_level: result.client_experience_level,
    project_size: result.project_size,
  };
}

async function extractRequirements(brief, category) {
  const hint = CATEGORY_HINTS[category] || CATEGORY_HINTS.other;
  const systemPrompt = `You are a requirements analyst for freelance projects.
Extract structured requirements from vague or incomplete briefs and stay grounded in the text.`;

  const userMessage = `Extract requirements from this ${category} project brief.
${hint}

Brief: "${brief}"

Respond with this exact JSON:
{
  "main_deliverable": "<core thing being built, one sentence>",
  "features": ["<feature 1>", "<feature 2>", "<feature 3>"],
  "deadline_hint": "<what client said about timeline, or null if not mentioned>",
  "budget_hint": "<any budget info, or null if not mentioned>",
  "technical_requirements": ["<tech req 1>", "<tech req 2>"],
  "assumptions": ["<assumption 1>", "<assumption 2>"],
  "client_experience_level": "<beginner | intermediate | expert>",
  "project_size": "<small | medium | large>"
}`;

  const result = await callGemini(systemPrompt, userMessage, EXTRACTION_SCHEMA);
  return validateExtraction(result);
}

module.exports = { extractRequirements, validateExtraction, CATEGORY_HINTS };
