const { callGemini } = require("../utils/geminiClient");
const { assertArray, assertPlainObject, coerceNumber, createError } = require("../utils/validation");
const { summarizeRagContext } = require("./ragContextBuilder");

const SCORE_WEIGHTS = {
  scope_clarity: 20,
  pricing_justification: 20,
  risk_coverage: 15,
  missing_info_handling: 15,
  professional_tone: 15,
  rag_grounding: 15,
};

const EVALUATION_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["overall_score", "verdict", "scores", "strengths", "concerns", "recommendations"],
  properties: {
    overall_score: { type: "number", minimum: 0, maximum: 100 },
    verdict: { type: "string" },
    scores: {
      type: "object",
      additionalProperties: false,
      required: Object.keys(SCORE_WEIGHTS),
      properties: Object.fromEntries(
        Object.entries(SCORE_WEIGHTS).map(([key, max]) => [
          key,
          { type: "number", minimum: 0, maximum: max },
        ]),
      ),
    },
    strengths: { type: "array", items: { type: "string" } },
    concerns: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
  },
};

function cleanStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

function clampScore(value, max) {
  const numeric = coerceNumber(value);
  if (numeric === null) {
    return null;
  }

  return Math.max(0, Math.min(max, numeric));
}

function validateEvaluation(result) {
  assertPlainObject(result, "evaluation");
  assertPlainObject(result.scores, "scores");

  const scores = {};
  Object.entries(SCORE_WEIGHTS).forEach(([key, max]) => {
    const score = clampScore(result.scores[key], max);
    if (score === null) {
      throw createError(`Incomplete response from AI: missing scores.${key}`);
    }
    scores[key] = score;
  });

  assertArray(result.strengths, "strengths");
  assertArray(result.concerns, "concerns");
  assertArray(result.recommendations, "recommendations");

  const computedScore = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const overall = clampScore(result.overall_score, 100);

  return {
    overall_score: overall === null ? Number(computedScore.toFixed(1)) : Number(overall.toFixed(1)),
    computed_score: Number(computedScore.toFixed(1)),
    verdict: typeof result.verdict === "string" && result.verdict.trim() ? result.verdict.trim() : "Needs review",
    scores,
    strengths: cleanStringArray(result.strengths),
    concerns: cleanStringArray(result.concerns),
    recommendations: cleanStringArray(result.recommendations),
  };
}

async function evaluateBidPackage({ brief, classification, extraction, scope, pricing, proposal, ragContext }) {
  const systemPrompt = `You are a strict freelance bid quality evaluator.
Score the bid package using the provided weighted dimensions. Keep scoring evidence-based and practical.`;

  const userMessage = `Evaluate this bid package.

Brief: "${brief}"
Classification: ${JSON.stringify(classification, null, 2)}
Extraction: ${JSON.stringify(extraction, null, 2)}
Scope: ${JSON.stringify(scope, null, 2)}
Pricing: ${JSON.stringify(pricing, null, 2)}
Proposal: ${JSON.stringify(proposal, null, 2)}
RAG context summary:
${summarizeRagContext(ragContext)}

Score weights:
${JSON.stringify(SCORE_WEIGHTS, null, 2)}

Respond with this exact JSON shape:
{
  "overall_score": <0-100>,
  "verdict": "<short verdict>",
  "scores": {
    "scope_clarity": <0-20>,
    "pricing_justification": <0-20>,
    "risk_coverage": <0-15>,
    "missing_info_handling": <0-15>,
    "professional_tone": <0-15>,
    "rag_grounding": <0-15>
  },
  "strengths": ["<strength>"],
  "concerns": ["<concern>"],
  "recommendations": ["<specific improvement>"]
}`;

  const result = await callGemini(systemPrompt, userMessage, EVALUATION_SCHEMA);
  return validateEvaluation(result);
}

module.exports = { SCORE_WEIGHTS, evaluateBidPackage, validateEvaluation };
