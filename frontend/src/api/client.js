async function postJson(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

async function getJson(path) {
  const response = await fetch(path);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export function classifyBrief(brief) {
  return postJson("/api/classify", { brief });
}

export function extractRequirements(brief, category) {
  return postJson("/api/extract", { brief, category });
}

export function detectGaps(brief, category, extraction) {
  return postJson("/api/gaps", { brief, category, extraction });
}

export function refineWithAnswers(brief, category, previousExtraction, userAnswers) {
  return postJson("/api/refine", { brief, category, previousExtraction, userAnswers });
}

export function buildScope(brief, category, extraction) {
  return postJson("/api/scope", { brief, category, extraction });
}

export function suggestPricing(brief, category, extraction, scope) {
  return postJson("/api/pricing", { brief, category, extraction, scope });
}

export function generateProposal(brief, category, extraction, scope, pricing) {
  return postJson("/api/proposal", { brief, category, extraction, scope, pricing });
}

export function startWorkspace(brief, preferences = {}) {
  return postJson("/api/workspace/start", { brief, preferences });
}

export function quickGenerateBid({ brief, preferences = {}, answers = [], previous = null }) {
  return postJson("/api/workspace/quick-generate", { brief, preferences, answers, previous });
}

export function refineWorkspace({
  workspace_id,
  brief,
  preferences,
  classification,
  extraction,
  ragContext,
  userAnswers,
}) {
  return postJson("/api/workspace/refine", {
    workspace_id,
    brief,
    preferences,
    classification,
    extraction,
    ragContext,
    userAnswers,
  });
}

export function generateWorkspacePackage({
  workspace_id,
  brief,
  preferences,
  classification,
  extraction,
  ragContext,
}) {
  return postJson("/api/workspace/generate-package", {
    workspace_id,
    brief,
    preferences,
    classification,
    extraction,
    ragContext,
  });
}

export function improveWorkspaceProposal({
  workspace_id,
  brief,
  classification,
  extraction,
  ragContext,
  scope,
  pricing,
  proposal,
  evaluation,
}) {
  return postJson("/api/workspace/improve-proposal", {
    workspace_id,
    brief,
    classification,
    extraction,
    ragContext,
    scope,
    pricing,
    proposal,
    evaluation,
  });
}

export function submitWorkspaceFeedback(feedback) {
  return postJson("/api/feedback", feedback);
}

export function searchKnowledge({ query, category, topK = 5 }) {
  const params = new URLSearchParams({
    q: query,
    topK: String(topK),
  });

  if (category) {
    params.set("category", category);
  }

  return getJson(`/api/knowledge/search?${params.toString()}`);
}
