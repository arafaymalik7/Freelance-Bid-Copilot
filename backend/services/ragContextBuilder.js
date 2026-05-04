const CLOSE_PROJECT_THRESHOLD = 0.62;
const RELATED_PROJECT_THRESHOLD = 0.5;

function cleanArray(value, limit = 5) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).slice(0, limit)
    : [];
}

function compactRecord(record) {
  return {
    id: record.id,
    title: record.title,
    type: record.type,
    category: record.category,
    subcategory: record.subcategory,
    similarity: record.similarity,
    retrieval_score: record.retrieval_score,
    why_retrieved: record.why_retrieved,
    source_file: record.source_file,
  };
}

function compactProjectCase(record) {
  const priceRange = record.metadata?.price_range || null;

  return {
    ...compactRecord(record),
    relevance_explanation:
      record.metadata?.why_relevant ||
      `Similar ${record.category.replace(/_/g, " ")} project used as a local pricing and scope reference.`,
    scope_summary: record.metadata?.scope_summary || "",
    features: cleanArray(record.metadata?.features, 6),
    risk_flags: cleanArray(record.metadata?.risk_flags, 5),
    typical_questions: cleanArray(record.metadata?.typical_questions, 5),
    price_range: priceRange ? {
      currency: priceRange.currency || "USD",
      min: Number.isFinite(Number(priceRange.min)) ? Number(priceRange.min) : null,
      max: Number.isFinite(Number(priceRange.max)) ? Number(priceRange.max) : null,
    } : null,
    timeline_days: record.metadata?.timeline_days || null,
    complexity: record.metadata?.complexity || "medium",
  };
}

function compactRule(record) {
  return {
    ...compactRecord(record),
    rule:
      record.metadata?.rule ||
      record.metadata?.pattern ||
      record.metadata?.risk ||
      record.metadata?.guideline ||
      record.title,
    recommendation: record.metadata?.recommendation || record.metadata?.recommended_question || "",
    base_min: Number.isFinite(Number(record.metadata?.base_min)) ? Number(record.metadata.base_min) : null,
    base_max: Number.isFinite(Number(record.metadata?.base_max)) ? Number(record.metadata.base_max) : null,
    currency: record.metadata?.currency || "USD",
    complexity_multiplier: Number.isFinite(Number(record.metadata?.complexity_multiplier))
      ? Number(record.metadata.complexity_multiplier)
      : null,
  };
}

function buildRagContext({ classification = {}, searchResults = [] } = {}) {
  const context = {
    source_ids: [],
    classification_hint: {
      category: classification.category || "other",
      subcategory: classification.subcategory || "general",
      complexity_signal: classification.complexity_signal || "medium",
    },
    similar_cases: [],
    related_cases: [],
    pricing_rules: [],
    scope_rules: [],
    risk_patterns: [],
    proposal_patterns: [],
    question_templates: [],
  };

  searchResults.forEach((record) => {
    if (!record || !record.id) {
      return;
    }

    context.source_ids.push(record.id);

    if (record.type === "project_case") {
      const sameCategory = record.category === classification.category;
      const sameSubcategory = record.subcategory === classification.subcategory;
      const relevanceScore = Number(record.retrieval_score ?? record.similarity);
      const closeEnough = relevanceScore >= CLOSE_PROJECT_THRESHOLD;
      const relatedEnough = relevanceScore >= RELATED_PROJECT_THRESHOLD;
      const compacted = compactProjectCase(record);

      if (sameCategory && closeEnough && (sameSubcategory || !classification.subcategory)) {
        context.similar_cases.push(compacted);
      } else if (sameCategory && relatedEnough) {
        context.related_cases.push(compacted);
      }
      return;
    }

    if (record.type === "pricing_rule") {
      context.pricing_rules.push(compactRule(record));
      return;
    }

    if (record.type === "scope_rule") {
      context.scope_rules.push(compactRule(record));
      return;
    }

    if (record.type === "risk_pattern") {
      context.risk_patterns.push(compactRule(record));
      return;
    }

    if (record.type === "proposal_pattern") {
      context.proposal_patterns.push(compactRule(record));
      return;
    }

    if (record.type === "question_template") {
      context.question_templates.push({
        ...compactRecord(record),
        questions: cleanArray(record.metadata?.typical_questions, 6),
      });
    }
  });

  context.source_ids = [...new Set(context.source_ids)];
  context.retrieval_quality = buildRetrievalQuality(context);
  return context;
}

function buildRetrievalQuality(context) {
  const hint = context.classification_hint || {};
  const isExact = (item) =>
    item?.category === hint.category &&
    item?.subcategory === hint.subcategory;
  const rulesUsed =
    context.pricing_rules.length +
    context.scope_rules.length +
    context.risk_patterns.length +
    context.proposal_patterns.length +
    context.question_templates.length;
  const closeMatches = context.similar_cases.length;
  const relatedReferences = context.related_cases.length;
  const exactPricingRules = context.pricing_rules.filter(isExact).length;
  const exactScopeRules = context.scope_rules.filter(isExact).length;
  const exactRiskPatterns = context.risk_patterns.filter(isExact).length;
  const exactQuestionTemplates = context.question_templates.filter(isExact).length;
  const exactRuleCount = exactPricingRules + exactScopeRules + exactRiskPatterns + exactQuestionTemplates;
  const hasExactPricingAndRisk = exactPricingRules >= 1 && exactRiskPatterns >= 1;
  const coverageLevel = closeMatches >= 1 && hasExactPricingAndRisk
    ? "strong"
    : closeMatches >= 1 || exactRuleCount >= 2
      ? "moderate"
      : "weak";
  const coverageReason = coverageLevel === "strong"
    ? "Close case plus exact pricing/risk rules are available for this project type."
    : coverageLevel === "moderate"
      ? "Some exact project-type evidence exists, but coverage is not complete."
      : "No close project case or enough exact project-type rules were found; broad references are used cautiously.";
  const whyRetrieved = [
    ...context.similar_cases,
    ...context.related_cases,
    ...context.pricing_rules,
    ...context.scope_rules,
    ...context.risk_patterns,
  ]
    .map((item) => item.why_retrieved)
    .filter(Boolean)
    .slice(0, 6);

  return {
    close_matches: closeMatches,
    exact_pricing_rules: exactPricingRules,
    exact_risk_patterns: exactRiskPatterns,
    exact_rule_count: exactRuleCount,
    related_references: relatedReferences,
    rules_used: rulesUsed,
    coverage_level: coverageLevel,
    coverage_reason: coverageReason,
    why_retrieved: [...new Set(whyRetrieved)],
  };
}

function summarizeRagContext(ragContext) {
  if (!ragContext || !Array.isArray(ragContext.source_ids) || ragContext.source_ids.length === 0) {
    return "No local RAG context was retrieved.";
  }

  const similarCases = (ragContext.similar_cases || [])
    .slice(0, 4)
    .map((item) => {
      const price =
        item.price_range &&
        typeof item.price_range === "object" &&
        Number.isFinite(Number(item.price_range.min)) &&
        Number.isFinite(Number(item.price_range.max))
          ? `$${item.price_range.min}-${item.price_range.max}`
          : "price unknown";
      return `${item.id}: ${item.title}; ${item.scope_summary}; reference ${price}; risks: ${item.risk_flags.join(", ")}`;
    })
    .join("\n");

  const relatedCases = (ragContext.related_cases || [])
    .slice(0, 3)
    .map((item) => `${item.id}: ${item.title}; related category reference only; ${item.scope_summary}`)
    .join("\n");

  const rules = [
    ...(ragContext.pricing_rules || []),
    ...(ragContext.scope_rules || []),
    ...(ragContext.risk_patterns || []),
  ]
    .slice(0, 8)
    .map((item) => `${item.id}: ${item.rule}${item.recommendation ? ` -> ${item.recommendation}` : ""}`)
    .join("\n");

  return [
    `RAG source IDs: ${ragContext.source_ids.join(", ")}`,
    ragContext.retrieval_quality
      ? `Retrieval coverage: ${ragContext.retrieval_quality.coverage_level}; close matches: ${ragContext.retrieval_quality.close_matches}; rules used: ${ragContext.retrieval_quality.rules_used}`
      : "",
    similarCases ? `Close similar cases:\n${similarCases}` : "",
    relatedCases ? `Related category references:\n${relatedCases}` : "",
    rules ? `Rules and patterns:\n${rules}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

module.exports = {
  CLOSE_PROJECT_THRESHOLD,
  RELATED_PROJECT_THRESHOLD,
  buildRagContext,
  buildRetrievalQuality,
  summarizeRagContext,
};
