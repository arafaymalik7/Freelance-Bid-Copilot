const { callGemini } = require("../utils/geminiClient");
const { assertArray, assertRequiredKeys, createError, normalizeQuestion } = require("../utils/validation");
const { validateExtraction } = require("./extractor");

const REFINE_SCHEMA = {
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
    "refinement_round",
    "new_follow_up_questions",
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
    refinement_round: { type: "number", minimum: 1 },
    new_follow_up_questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "why_important", "answer_type", "choices"],
        properties: {
          question: { type: "string" },
          why_important: { type: "string" },
          answer_type: { type: "string", enum: ["text", "yes_no", "number", "choice"] },
          choices: { type: ["array", "null"], items: { type: "string" } },
        },
      },
    },
  },
};

function validateRefinement(result) {
  assertRequiredKeys(result, ["refinement_round", "new_follow_up_questions"]);
  const extraction = validateExtraction(result);
  assertArray(result.new_follow_up_questions, "new_follow_up_questions");

  if (typeof result.refinement_round !== "number" || result.refinement_round < 1) {
    throw createError("Incomplete response from AI: missing refinement_round");
  }

  return {
    ...extraction,
    refinement_round: result.refinement_round,
    new_follow_up_questions: result.new_follow_up_questions
    .map(normalizeQuestion)
      .filter((question) => question.question),
  };
}

async function refineWithAnswers(brief, category, previousExtraction, userAnswers) {
  const nextRound =
    typeof previousExtraction.refinement_round === "number" && previousExtraction.refinement_round > 0
      ? previousExtraction.refinement_round + 1
      : 1;
  const systemPrompt = `You are a requirements analyst updating a project brief.
Use new client answers to refine the extraction, remove resolved assumptions, and leave only truly open questions.`;

  const formattedAnswers = userAnswers
    .map((answer) => `Q: ${answer.question}\nA: ${answer.answer}`)
    .join("\n\n");

  const userMessage = `Update this project's requirements using the new information provided.

Category: ${category}
Original brief: "${brief}"
Previous extraction: ${JSON.stringify(previousExtraction, null, 2)}

New information (Q&A with client):
${formattedAnswers}

Respond with this exact JSON:
{
  "main_deliverable": "<updated if clarified>",
  "features": ["<updated complete features list>"],
  "deadline_hint": "<more specific if answered, otherwise keep previous>",
  "budget_hint": "<more specific if answered, otherwise keep previous>",
  "technical_requirements": ["<updated list>"],
  "assumptions": ["<only assumptions still unresolved>"],
  "client_experience_level": "<beginner | intermediate | expert>",
  "project_size": "<small | medium | large>",
  "refinement_round": ${nextRound},
  "new_follow_up_questions": [
    {
      "question": "<any remaining important question>",
      "why_important": "<one sentence>",
      "answer_type": "<text | yes_no | number | choice>",
      "choices": null
    }
  ]
}`;

  const result = await callGemini(systemPrompt, userMessage, REFINE_SCHEMA);
  return {
    ...validateRefinement(result),
    refinement_round: nextRound,
  };
}

module.exports = { refineWithAnswers, validateRefinement };
