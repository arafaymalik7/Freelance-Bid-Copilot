const { callGemini } = require("../utils/geminiClient");
const { assertArray, assertRequiredKeys, normalizeQuestion } = require("../utils/validation");
const { summarizeRagContext } = require("./ragContextBuilder");

const MAX_FOLLOW_UP_QUESTIONS = 3;

const GAP_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["missing_info", "risk_flags", "follow_up_questions"],
  properties: {
    missing_info: { type: "array", items: { type: "string" } },
    risk_flags: { type: "array", items: { type: "string" } },
    follow_up_questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "why_important", "answer_type", "choices"],
        properties: {
          question: { type: "string" },
          why_important: { type: "string" },
          answer_type: { type: "string", enum: ["text", "yes_no", "number", "choice"] },
          choices: {
            type: ["array", "null"],
            items: { type: "string" },
          },
        },
      },
    },
  },
};

function cleanStringArray(value) {
  return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
}

function validateGaps(result) {
  assertRequiredKeys(result, ["follow_up_questions"]);
  assertArray(result.missing_info, "missing_info");
  assertArray(result.risk_flags, "risk_flags");
  assertArray(result.follow_up_questions, "follow_up_questions");

  result.missing_info = cleanStringArray(result.missing_info);
  result.risk_flags = cleanStringArray(result.risk_flags);
  result.follow_up_questions = result.follow_up_questions
    .map(normalizeQuestion)
    .filter((question) => question.question)
    .slice(0, MAX_FOLLOW_UP_QUESTIONS);

  return result;
}

async function detectGaps(brief, category, extraction, ragContext = null) {
  const contextSummary = summarizeRagContext(ragContext);
  const systemPrompt = `You are a senior freelance project consultant.
Identify missing information, pricing risks, and at most ${MAX_FOLLOW_UP_QUESTIONS} focused follow-up questions before a freelancer quotes a project.
Use local RAG context to identify common risks, but keep questions specific to the current brief.`;

  const userMessage = `Given this client brief and extracted requirements, identify gaps
and generate only the top ${MAX_FOLLOW_UP_QUESTIONS} follow-up questions a freelancer should ask before giving a quote.

Project category: ${category}
Original brief: "${brief}"
Extracted requirements: ${JSON.stringify(extraction, null, 2)}
Local RAG context:
${contextSummary}

Respond with this exact JSON:
{
  "missing_info": ["<missing detail 1>", "<missing detail 2>"],
  "risk_flags": ["<risk 1>", "<risk 2>"],
  "follow_up_questions": [
    {
      "question": "<specific question to ask>",
      "why_important": "<one sentence: why this affects the price or scope>",
      "answer_type": "<text | yes_no | number | choice>",
      "choices": ["<option 1>", "<option 2>"] 
    }
  ]
}`;

  const result = await callGemini(systemPrompt, userMessage, GAP_SCHEMA);
  return validateGaps(result);
}

module.exports = { MAX_FOLLOW_UP_QUESTIONS, detectGaps, validateGaps };
