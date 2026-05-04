const { callGemini } = require("../utils/geminiClient");
const { logDebug, logInfo } = require("../utils/logger");
const { assertRequiredKeys, assertString, coerceNumber, createError, ensurePricingTierOrder } = require("../utils/validation");
const { summarizeRagContext } = require("./ragContextBuilder");

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
    pricing_basis: { type: "array", items: { type: "string" } },
    what_would_increase_price: { type: "array", items: { type: "string" } },
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
  result.pricing_basis = Array.isArray(result.pricing_basis)
    ? result.pricing_basis.filter((note) => typeof note === "string" && note.trim()).map((note) => note.trim())
    : [];
  result.what_would_increase_price = Array.isArray(result.what_would_increase_price)
    ? result.what_would_increase_price.filter((note) => typeof note === "string" && note.trim()).map((note) => note.trim())
    : [];

  ensurePricingTierOrder(result);
  return result;
}

function adjustTier(tier, factor) {
  return {
    ...tier,
    min: Math.round(tier.min * factor),
    max: Math.round(tier.max * factor),
  };
}

function tierRanges(pricing) {
  return {
    basic: pricing.basic ? { min: pricing.basic.min, max: pricing.basic.max } : null,
    recommended: pricing.recommended ? { min: pricing.recommended.min, max: pricing.recommended.max } : null,
    premium: pricing.premium ? { min: pricing.premium.min, max: pricing.premium.max } : null,
  };
}

function average(values) {
  const numeric = values.map(Number).filter((value) => Number.isFinite(value));

  if (!numeric.length) {
    return null;
  }

  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

function getRegionMultiplier(region = "") {
  const normalized = String(region).toLowerCase();

  if (/south asia|pakistan|budget/.test(normalized)) {
    return 0.78;
  }

  if (/eu|premium/.test(normalized)) {
    return 1.12;
  }

  return 1;
}

function getUrgencyMultiplier(urgency = "") {
  return String(urgency).toLowerCase() === "rush" ? 1.12 : 1;
}

function getSizeMultiplier(projectSize = "medium") {
  const multipliers = {
    small: 0.82,
    medium: 1,
    large: 1.08,
  };

  return multipliers[projectSize] || multipliers.medium;
}

function collectRagPriceSignals({ category, ragContext = {} } = {}) {
  const context = ragContext || {};
  const subcategory = context.classification_hint?.subcategory;
  const ruleSignals = (context.pricing_rules || [])
    .filter((rule) => Number.isFinite(Number(rule.base_min)) && Number.isFinite(Number(rule.base_max)) && Number(rule.base_max) > 0)
    .map((rule) => {
      const exactRule = rule.category === category && subcategory && rule.subcategory === subcategory;
      const broadRule = rule.category === "all" || (rule.category === category && rule.subcategory === "all");
      const relatedRule = rule.category === category && rule.subcategory !== subcategory;

      if (!exactRule && !broadRule && !relatedRule) {
        return null;
      }

      return {
        id: rule.id,
        exact: exactRule,
        max: Number(rule.base_max),
        min: Number(rule.base_min),
        strength: exactRule ? "exact_rule" : broadRule ? "broad_rule" : "related_rule",
        title: rule.title || rule.rule || rule.id,
        type: "pricing_rule",
        weight: exactRule ? 1.35 : broadRule ? 0.35 : 0.18,
      };
    })
    .filter(Boolean);
  const caseSignals = [
    ...(context.similar_cases || []).map((item) => ({ ...item, close: true })),
    ...(context.related_cases || []).slice(0, 2).map((item) => ({ ...item, close: false })),
  ]
    .filter((item) => item.price_range && Number.isFinite(Number(item.price_range.min)) && Number.isFinite(Number(item.price_range.max)))
    .map((item) => ({
      id: item.id,
      exact: Boolean(item.close),
      max: Number(item.price_range.max),
      min: Number(item.price_range.min),
      strength: item.close ? "close_case" : "related_case",
      title: item.title || item.id,
      type: item.close ? "close_case" : "related_case",
      weight: item.close ? 1.2 : 0.22,
    }));

  const candidateSignals = [...ruleSignals, ...caseSignals];
  const exactSignals = candidateSignals.filter((signal) => signal.exact);
  const broadSignals = candidateSignals.filter((signal) => signal.strength === "broad_rule");
  const relatedSignals = candidateSignals.filter((signal) => !signal.exact && signal.strength !== "broad_rule");

  if (exactSignals.length) {
    return [...exactSignals, ...broadSignals.slice(0, 1)];
  }

  if (broadSignals.length) {
    return [...broadSignals, ...relatedSignals.slice(0, 1)];
  }

  return relatedSignals.slice(0, 2);
}

function weightedAverage(signals, field) {
  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);

  if (!signals.length || !totalWeight) {
    return null;
  }

  return signals.reduce((sum, signal) => sum + signal[field] * signal.weight, 0) / totalWeight;
}

function roundToNearest(value, step = 50) {
  return Math.max(step, Math.round(value / step) * step);
}

function getContextSubcategory(ragContext = {}) {
  return ragContext?.classification_hint?.subcategory || "general";
}

function getEffortRateBand(category, ragContext = {}) {
  const subcategory = getContextSubcategory(ragContext);

  if (category === "web_development" && subcategory === "saas_tool") {
    return { min: 150, max: 280 };
  }

  if (category === "web_development" && subcategory === "ecommerce_store") {
    return { min: 110, max: 220 };
  }

  if (category === "web_development") {
    return { min: 85, max: 170 };
  }

  if (category === "mobile_app" && subcategory === "mobile_game") {
    return { min: 145, max: 270 };
  }

  if (category === "mobile_app") {
    return { min: 135, max: 255 };
  }

  if (category === "data_analytics") {
    return { min: 100, max: 220 };
  }

  if (category === "ui_ux_design") {
    return { min: 90, max: 180 };
  }

  if (category === "content_writing") {
    return { min: 70, max: 140 };
  }

  return { min: 85, max: 170 };
}

function calculateEffortPriceRange({ category, extraction = {}, ragContext = {}, scope = {} } = {}) {
  const days = Number(scope.total_estimated_days);

  if (!Number.isFinite(days) || days <= 0) {
    return null;
  }

  const boundedDays = Math.max(2, Math.min(180, days));
  const rates = getEffortRateBand(category, ragContext);
  const complexityMultiplier = extraction.project_size === "large"
    ? 1.08
    : extraction.project_size === "small"
      ? 0.82
      : 1;
  const recommendedMin = roundToNearest(boundedDays * rates.min * 0.72 * complexityMultiplier);
  const recommendedMax = roundToNearest(boundedDays * rates.max * complexityMultiplier);

  return {
    days: boundedDays,
    rate_band: rates,
    recommended_min: recommendedMin,
    recommended_max: Math.max(recommendedMax, recommendedMin + 500),
  };
}

function calculateRagPriceAnchor({
  brief,
  category,
  extraction = {},
  preferences = {},
  ragContext = {},
  scope = {},
} = {}) {
  const signals = collectRagPriceSignals({ category, ragContext });
  const exactSignalCount = signals.filter((signal) => signal.strength === "exact_rule" || signal.strength === "close_case").length;
  const relatedSignalCount = signals.length - exactSignalCount;
  const caps = getFreelancerPricingCaps({ brief, category, extraction, ragContext });
  const effortRange = calculateEffortPriceRange({ category, extraction, ragContext, scope });
  const fallbackRecommendedMax = caps.recommendedMax;
  const fallbackRecommendedMin = Math.round(fallbackRecommendedMax * 0.55);
  const evidenceMin = weightedAverage(signals, "min") || fallbackRecommendedMin;
  const evidenceMax = weightedAverage(signals, "max") || fallbackRecommendedMax;
  const rawMin = effortRange ? Math.max(evidenceMin, effortRange.recommended_min) : evidenceMin;
  const rawMax = effortRange ? Math.max(evidenceMax, effortRange.recommended_max) : evidenceMax;
  const multiplier =
    getSizeMultiplier(extraction.project_size) *
    getRegionMultiplier(preferences.region) *
    getUrgencyMultiplier(preferences.urgency);
  const recommendedMin = roundToNearest(Math.min(rawMin, rawMax * 0.72) * multiplier);
  const recommendedMax = roundToNearest(Math.max(rawMax, recommendedMin + 500) * multiplier);
  const basicMin = roundToNearest(recommendedMin * 0.62);
  const basicMax = roundToNearest(recommendedMin * 0.9);
  const premiumMin = roundToNearest(recommendedMax * 1.08);
  const premiumMax = roundToNearest(recommendedMax * (String(preferences.urgency).toLowerCase() === "rush" ? 1.55 : 1.42));
  const confidence =
    exactSignalCount >= 2
      ? "strong"
      : exactSignalCount === 1
        ? "moderate"
        : signals.length
          ? "related"
          : "fallback";

  return {
    confidence,
    currency: "USD",
    evidence_count: signals.length,
    exact_signal_count: exactSignalCount,
    effort_range: effortRange,
    final_ranges: {
      basic: { min: basicMin, max: Math.max(basicMax, basicMin + 300) },
      recommended: { min: recommendedMin, max: Math.max(recommendedMax, recommendedMin + 500) },
      premium: { min: premiumMin, max: Math.max(premiumMax, premiumMin + 800) },
    },
    method: confidence === "strong"
      ? "exact_rag_cases_and_pricing_rules"
      : confidence === "moderate"
        ? "exact_rag_pricing_anchor"
        : confidence === "related"
          ? "related_category_anchor"
          : "category_guardrail_fallback",
    related_signal_count: relatedSignalCount,
    source_titles: signals.map((signal) => signal.title).slice(0, 5),
  };
}

function applyRagPricingAnchor(pricing, anchor) {
  if (!anchor?.final_ranges) {
    return pricing;
  }

  const anchored = {
    ...pricing,
    basic: { ...pricing.basic, ...anchor.final_ranges.basic },
    recommended: { ...pricing.recommended, ...anchor.final_ranges.recommended },
    premium: { ...pricing.premium, ...anchor.final_ranges.premium },
    pricing_basis: [
      ...(Array.isArray(pricing.pricing_basis) ? pricing.pricing_basis : []),
      anchor.source_titles.length
        ? anchor.confidence === "related"
          ? `Broad category estimate used related references: ${anchor.source_titles.join(", ")}.`
          : `Local estimate evidence used close cases/rules: ${anchor.source_titles.join(", ")}.`
        : "Category pricing guardrails were used because no close price evidence was available.",
    ],
    pricing_notes: [
      ...(Array.isArray(pricing.pricing_notes) ? pricing.pricing_notes : []),
      "Price bands were calculated from retrieved local evidence before final sanity checks.",
    ],
    rag_pricing_anchor: anchor,
  };

  ensurePricingTierOrder(anchored);
  return anchored;
}

function hasEnterpriseSignal(brief = "", extraction = {}, ragContext = {}) {
  const context = ragContext || {};
  const text = [
    brief,
    extraction.main_deliverable,
    ...(Array.isArray(extraction.features) ? extraction.features : []),
  ].join(" ").toLowerCase();

  return (
    /\b(enterprise|corporate|large scale|millions of users|multi tenant|marketplace|driver|restaurant|vendor|fleet|hipaa|fintech regulated)\b/.test(text) ||
    (context.similar_cases || []).some((item) => item.subcategory === "marketplace_app")
  );
}

function getFreelancerPricingCaps({ brief, category, extraction = {}, ragContext = {} } = {}) {
  const projectSize = extraction.project_size || "medium";
  const enterprise = hasEnterpriseSignal(brief, extraction, ragContext);
  const subcategory = getContextSubcategory(ragContext);

  const caps = {
    web_development: {
      small: 4500,
      medium: 9000,
      large: enterprise ? 22000 : 14000,
    },
    web_development_saas_tool: {
      small: 15000,
      medium: enterprise ? 32000 : 26000,
      large: enterprise ? 46000 : 36000,
    },
    mobile_app: {
      small: 7000,
      medium: 16000,
      large: enterprise ? 38000 : 26000,
    },
    ui_ux_design: {
      small: 2500,
      medium: 5500,
      large: 9500,
    },
    content_writing: {
      small: 1500,
      medium: 3500,
      large: 6500,
    },
    data_analytics: {
      small: 2500,
      medium: 6500,
      large: 12000,
    },
    other: {
      small: 2500,
      medium: 6000,
      large: 12000,
    },
  };

  const categoryCaps = category === "web_development" && subcategory === "saas_tool"
    ? caps.web_development_saas_tool
    : caps[category] || caps.other;
  const premiumMax = categoryCaps[projectSize] || categoryCaps.medium;
  const recommendedMax = Math.round(premiumMax * 0.68);
  const basicMax = Math.round(recommendedMax * 0.68);

  return {
    basicMax,
    enterprise,
    premiumMax,
    recommendedMax,
  };
}

function clampTier(tier, maxAllowed, minFloor = 300) {
  const originalMin = Number(tier.min);
  const originalMax = Number(tier.max);

  if (!Number.isFinite(originalMin) || !Number.isFinite(originalMax) || originalMax <= maxAllowed) {
    return { tier, clamped: false };
  }

  const factor = maxAllowed / originalMax;
  const nextMax = Math.max(minFloor, Math.round(originalMax * factor));
  const nextMin = Math.max(minFloor, Math.min(nextMax - 100, Math.round(originalMin * factor)));

  return {
    clamped: true,
    tier: {
      ...tier,
      min: nextMin,
      max: nextMax,
    },
  };
}

function ensureMinimumSpread(pricing) {
  const fixed = { ...pricing };

  if (fixed.basic.max >= fixed.recommended.min) {
    fixed.recommended.min = fixed.basic.max + 250;
  }

  if (fixed.recommended.max < fixed.recommended.min) {
    fixed.recommended.max = fixed.recommended.min + 500;
  }

  if (fixed.recommended.max >= fixed.premium.min) {
    fixed.premium.min = fixed.recommended.max + 500;
  }

  if (fixed.premium.max < fixed.premium.min) {
    fixed.premium.max = fixed.premium.min + 1000;
  }

  return fixed;
}

function applyPricingGuardrails(pricing, { brief, category, extraction, ragContext } = {}) {
  const originalRanges = tierRanges(pricing);
  const caps = getFreelancerPricingCaps({ brief, category, extraction, ragContext });
  const basic = clampTier(pricing.basic, caps.basicMax);
  const recommended = clampTier(pricing.recommended, caps.recommendedMax);
  const premium = clampTier(pricing.premium, caps.premiumMax);
  const clamped = basic.clamped || recommended.clamped || premium.clamped;
  let guarded = {
    ...pricing,
    basic: basic.tier,
    recommended: recommended.tier,
    premium: premium.tier,
  };

  guarded = ensureMinimumSpread(guarded);
  ensurePricingTierOrder(guarded);
  guarded.pricing_sanity = {
    clamped,
    original_ranges: originalRanges,
    final_ranges: tierRanges(guarded),
    reason: clamped
      ? "Freelancer-realistic guardrails reduced an excessive AI price estimate."
      : "AI pricing stayed within freelancer-realistic guardrails.",
    max_recommended_allowed: caps.recommendedMax,
    max_premium_allowed: caps.premiumMax,
    enterprise_signal: caps.enterprise,
  };

  if (clamped) {
    guarded.pricing_notes = [
      ...guarded.pricing_notes,
      "Pricing was sanity-checked against freelancer-realistic project ranges.",
    ];
  }

  return guarded;
}

function applyFeedbackAdjustment(pricing, feedbackHints = {}) {
  const factor = Number(feedbackHints.price_adjustment_factor);
  if (!Number.isFinite(factor) || factor === 1) {
    return pricing;
  }

  const boundedFactor = Math.max(0.85, Math.min(1.15, factor));
  const adjusted = {
    ...pricing,
    basic: adjustTier(pricing.basic, boundedFactor),
    recommended: adjustTier(pricing.recommended, boundedFactor),
    premium: adjustTier(pricing.premium, boundedFactor),
    hourly_equivalent: Math.round(pricing.hourly_equivalent * boundedFactor),
    pricing_notes: [
      ...pricing.pricing_notes,
      `Feedback learning applied a bounded ${(boundedFactor * 100).toFixed(0)}% pricing adjustment.`,
    ],
  };

  ensurePricingTierOrder(adjusted);
  return adjusted;
}

async function suggestPricing(
  brief,
  category,
  extraction,
  scope,
  ragContext = null,
  preferences = {},
  feedbackHints = {},
  diagnostics = {},
) {
  const contextSummary = summarizeRagContext(ragContext);
  const ragPriceAnchor = calculateRagPriceAnchor({
    brief,
    category,
    extraction,
    preferences,
    ragContext,
    scope,
  });
  logInfo("pricing_anchor_calculated", {
    request_id: diagnostics.requestId,
    category,
    project_size: extraction.project_size,
    method: ragPriceAnchor.method,
    confidence: ragPriceAnchor.confidence,
    evidence_count: ragPriceAnchor.evidence_count,
    exact_signal_count: ragPriceAnchor.exact_signal_count,
    related_signal_count: ragPriceAnchor.related_signal_count,
    effort_days: ragPriceAnchor.effort_range?.days,
    effort_range: ragPriceAnchor.effort_range
      ? {
          recommended_min: ragPriceAnchor.effort_range.recommended_min,
          recommended_max: ragPriceAnchor.effort_range.recommended_max,
        }
      : null,
    source_titles: ragPriceAnchor.source_titles,
    final_ranges: ragPriceAnchor.final_ranges,
  });
  logInfo("pricing_feedback_hints", {
    request_id: diagnostics.requestId,
    feedback_count: feedbackHints.feedback_count || 0,
    average_rating: feedbackHints.average_rating,
    price_adjustment_factor: feedbackHints.price_adjustment_factor,
    proposal_hint_count: Array.isArray(feedbackHints.proposal_hints) ? feedbackHints.proposal_hints.length : 0,
  });
  const regionPreference = preferences.region || "global/USD";
  const urgencyPreference = preferences.urgency || "normal";
  const systemPrompt = `You are a freelance pricing consultant.
Suggest realistic USD pricing language based on complexity, scope, delivery effort, revision burden, local RAG references, and explicit risk.
Use the provided deterministic RAG price anchor as the numeric target. Do not invent enterprise pricing above that anchor.
Do not claim market facts that are not supported by the brief or RAG context.`;

  const userMessage = `Suggest pricing bands for this freelance project.
Use realistic USD market rates for a competent freelancer.

Category: ${category}
Project size: ${extraction.project_size}
Total estimated days: ${scope.total_estimated_days}
Scope summary: ${scope.project_summary}
Key deliverables: ${scope.in_scope.join(", ")}
Original brief: "${brief}"
Region preference: ${regionPreference}
Urgency preference: ${urgencyPreference}
Feedback hints: ${JSON.stringify(feedbackHints, null, 2)}
Deterministic RAG price anchor:
${JSON.stringify(ragPriceAnchor, null, 2)}
Local RAG context:
${contextSummary}

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
  ],
  "pricing_basis": [
    "<which similar case, rule, or assumption influenced pricing>"
  ],
  "what_would_increase_price": [
    "<scope change or risk that would raise price>"
  ]
}`;

  const result = await callGemini(systemPrompt, userMessage, PRICING_SCHEMA);
  const validated = validatePricing(result);
  logDebug("pricing_ai_result", {
    request_id: diagnostics.requestId,
    currency: validated.currency,
    ranges: tierRanges(validated),
    notes_count: validated.pricing_notes.length,
    basis_count: validated.pricing_basis.length,
  });
  const anchored = applyRagPricingAnchor(validated, ragPriceAnchor);
  logInfo("pricing_anchor_applied", {
    request_id: diagnostics.requestId,
    anchor_confidence: ragPriceAnchor.confidence,
    ranges: tierRanges(anchored),
  });
  const adjusted = applyFeedbackAdjustment(anchored, feedbackHints);
  const guarded = applyPricingGuardrails(adjusted, { brief, category, extraction, ragContext });
  logInfo("pricing_guardrails_result", {
    request_id: diagnostics.requestId,
    clamped: guarded.pricing_sanity?.clamped,
    reason: guarded.pricing_sanity?.reason,
    enterprise_signal: guarded.pricing_sanity?.enterprise_signal,
    max_recommended_allowed: guarded.pricing_sanity?.max_recommended_allowed,
    max_premium_allowed: guarded.pricing_sanity?.max_premium_allowed,
    final_ranges: guarded.pricing_sanity?.final_ranges,
  });
  return guarded;
}

module.exports = {
  applyFeedbackAdjustment,
  applyPricingGuardrails,
  applyRagPricingAnchor,
  calculateRagPriceAnchor,
  collectRagPriceSignals,
  getFreelancerPricingCaps,
  suggestPricing,
  validatePricing,
};
