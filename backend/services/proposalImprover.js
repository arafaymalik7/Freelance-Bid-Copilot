const { callGemini } = require("../utils/geminiClient");
const { assertArray, assertRequiredKeys, assertString } = require("../utils/validation");
const { summarizeRagContext } = require("./ragContextBuilder");

const IMPROVER_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["subject_line", "proposal_draft", "client_reply", "changes_made"],
  properties: {
    subject_line: { type: "string" },
    proposal_draft: { type: "string" },
    client_reply: { type: "string" },
    changes_made: { type: "array", items: { type: "string" } },
  },
};

function validateImprovedProposal(result) {
  assertRequiredKeys(result, ["subject_line", "proposal_draft", "client_reply", "changes_made"]);
  assertString(result.subject_line, "subject_line");
  assertString(result.proposal_draft, "proposal_draft");
  assertString(result.client_reply, "client_reply");
  assertArray(result.changes_made, "changes_made");

  return {
    subject_line: result.subject_line.trim(),
    proposal_draft: result.proposal_draft.trim(),
    client_reply: result.client_reply.trim(),
    changes_made: result.changes_made.filter((item) => typeof item === "string" && item.trim()),
  };
}

async function improveProposal({ brief, classification, extraction, scope, pricing, proposal, evaluation, ragContext }) {
  const systemPrompt = `You improve freelance proposals based on evaluator feedback.
Keep the revised proposal concise, specific, and grounded in the provided scope and RAG references.`;

  const userMessage = `Improve this proposal using the quality evaluation.

Brief: "${brief}"
Classification: ${JSON.stringify(classification, null, 2)}
Extraction: ${JSON.stringify(extraction, null, 2)}
Scope: ${JSON.stringify(scope, null, 2)}
Pricing: ${JSON.stringify(pricing, null, 2)}
Current proposal: ${JSON.stringify(proposal, null, 2)}
Evaluation: ${JSON.stringify(evaluation, null, 2)}
RAG context summary:
${summarizeRagContext(ragContext)}

Respond with this exact JSON:
{
  "subject_line": "<improved subject line>",
  "proposal_draft": "<improved full proposal text, plain text>",
  "client_reply": "<improved short client reply>",
  "changes_made": ["<specific change made>"]
}`;

  const result = await callGemini(systemPrompt, userMessage, IMPROVER_SCHEMA);
  return validateImprovedProposal(result);
}

module.exports = { improveProposal, validateImprovedProposal };
