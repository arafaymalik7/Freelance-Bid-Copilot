const { callGemini } = require("../utils/geminiClient");
const { assertRequiredKeys, assertString } = require("../utils/validation");

const PROPOSAL_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["subject_line", "proposal_draft", "client_reply"],
  properties: {
    subject_line: { type: "string" },
    proposal_draft: { type: "string" },
    client_reply: { type: "string" },
  },
};

function validateProposal(result) {
  assertRequiredKeys(result, ["proposal_draft", "client_reply"]);
  assertString(result.subject_line, "subject_line");
  assertString(result.proposal_draft, "proposal_draft");
  assertString(result.client_reply, "client_reply");
  return result;
}

async function generateProposal(brief, category, extraction, scope, pricing) {
  const systemPrompt = `You are a professional proposal writer for freelancers.
Write concise, confident, specific proposals without filler or hype.`;

  const userMessage = `Write a professional freelance proposal and a short client reply.

Category: ${category}
Original brief: "${brief}"
Deliverable: ${extraction.main_deliverable}
Features: ${extraction.features.join(", ")}
Timeline: ${scope.total_estimated_days} days total
Recommended price range: $${pricing.recommended.min} - $${pricing.recommended.max}
Payment structure: ${scope.payment_structure}

Respond with this exact JSON:
{
  "subject_line": "<email subject line for the proposal>",
  "proposal_draft": "<full professional proposal text, plain text, no markdown symbols>",
  "client_reply": "<short 3-5 sentence message to send immediately, acknowledging the request and asking 1 key clarifying question or proposing a brief call>"
}`;

  const result = await callGemini(systemPrompt, userMessage, PROPOSAL_SCHEMA);
  return validateProposal(result);
}

module.exports = { generateProposal, validateProposal };

