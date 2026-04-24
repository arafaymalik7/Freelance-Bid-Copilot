const { callGemini } = require("../utils/geminiClient");
const {
  assertArray,
  assertPlainObject,
  assertRequiredKeys,
  assertString,
  coerceNumber,
  createError,
} = require("../utils/validation");

const SCOPE_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: [
    "project_summary",
    "in_scope",
    "out_of_scope",
    "milestones",
    "total_estimated_days",
    "recommended_revision_rounds",
    "payment_structure",
  ],
  properties: {
    project_summary: { type: "string" },
    in_scope: { type: "array", items: { type: "string" } },
    out_of_scope: { type: "array", items: { type: "string" } },
    milestones: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "deliverable", "estimated_days"],
        properties: {
          name: { type: "string" },
          deliverable: { type: "string" },
          estimated_days: { type: "number", minimum: 1 },
        },
      },
    },
    total_estimated_days: { type: "number", minimum: 1 },
    recommended_revision_rounds: { type: "number", minimum: 0 },
    payment_structure: { type: "string" },
  },
};

function cleanStringArray(items) {
  return items.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
}

function validateScope(result) {
  assertRequiredKeys(result, ["in_scope", "milestones"]);
  assertString(result.project_summary, "project_summary");
  assertArray(result.in_scope, "in_scope");
  assertArray(result.out_of_scope, "out_of_scope");
  assertArray(result.milestones, "milestones");
  assertString(result.payment_structure, "payment_structure");

  result.in_scope = cleanStringArray(result.in_scope);
  result.out_of_scope = cleanStringArray(result.out_of_scope);
  result.total_estimated_days = coerceNumber(result.total_estimated_days);
  result.recommended_revision_rounds = coerceNumber(result.recommended_revision_rounds);

  if (result.total_estimated_days === null) {
    throw createError("Incomplete response from AI: missing total_estimated_days");
  }

  if (result.recommended_revision_rounds === null) {
    throw createError("Incomplete response from AI: missing recommended_revision_rounds");
  }

  result.milestones = result.milestones.map((milestone) => {
    assertPlainObject(milestone, "milestones");
    assertString(milestone.name, "milestones.name");
    assertString(milestone.deliverable, "milestones.deliverable");

    const estimatedDays = coerceNumber(milestone.estimated_days);
    if (estimatedDays === null) {
      throw createError("Incomplete response from AI: missing milestones.estimated_days");
    }

    return {
      name: milestone.name.trim(),
      deliverable: milestone.deliverable.trim(),
      estimated_days: estimatedDays,
    };
  });

  return result;
}

async function buildScope(brief, category, extraction) {
  const systemPrompt = `You are a project manager creating a realistic scope document.
Be specific, avoid padding, and make sure the scope is useful for pricing and delivery planning.`;

  const userMessage = `Create a project scope for this freelance project.

Category: ${category}
Brief: "${brief}"
Requirements: ${JSON.stringify(extraction, null, 2)}

Respond with this exact JSON:
{
  "project_summary": "<2-3 sentence professional summary of what is being built>",
  "in_scope": ["<specific deliverable 1>", "<specific deliverable 2>"],
  "out_of_scope": ["<common addition that is not included 1>", "<common addition 2>"],
  "milestones": [
    {
      "name": "<milestone name>",
      "deliverable": "<what will be delivered>",
      "estimated_days": <number>
    }
  ],
  "total_estimated_days": <number>,
  "recommended_revision_rounds": <number>,
  "payment_structure": "<e.g. 50% upfront, 50% on delivery>"
}`;

  const result = await callGemini(systemPrompt, userMessage, SCOPE_SCHEMA);
  return validateScope(result);
}

module.exports = { buildScope, validateScope };

