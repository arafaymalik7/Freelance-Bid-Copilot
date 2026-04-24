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

