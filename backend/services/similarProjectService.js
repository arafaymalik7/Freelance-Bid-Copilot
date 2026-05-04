const { buildRagContext } = require("./ragContextBuilder");
const { buildSearchableText, getAllKnowledgeEntries } = require("./knowledgeBaseService");
const { searchVectorIndex } = require("./vectorSearchService");
const { logDebug, logInfo } = require("../utils/logger");

const PURPOSE_TYPES = {
  project_case: ["project_case"],
  pricing: ["pricing_rule", "project_case"],
  scope: ["scope_rule", "project_case"],
  risk: ["risk_pattern", "project_case"],
  proposal: ["proposal_pattern"],
  questions: ["question_template"],
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "app",
  "are",
  "build",
  "can",
  "client",
  "for",
  "from",
  "have",
  "how",
  "into",
  "need",
  "needs",
  "our",
  "project",
  "that",
  "the",
  "their",
  "this",
  "with",
  "want",
  "wants",
  "website",
]);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function buildFocusedQueries({ brief = "", classification = {} } = {}) {
  const category = normalizeText(classification.category);
  const subcategory = normalizeText(classification.subcategory);
  const complexity = normalizeText(classification.complexity_signal);
  const signal = [category, subcategory, complexity].filter(Boolean).join(" ");
  const featureTerms = tokenize(brief).slice(0, 16).join(" ");

  return [
    {
      purpose: "project_case",
      text: `${signal} similar freelance project case ${featureTerms} ${brief}`,
      topK: 8,
      types: PURPOSE_TYPES.project_case,
    },
    {
      purpose: "pricing",
      text: `${signal} pricing budget estimate cost fixed price complexity ${featureTerms}`,
      topK: 7,
      types: PURPOSE_TYPES.pricing,
    },
    {
      purpose: "scope",
      text: `${signal} scope deliverables milestones inclusions exclusions ${featureTerms}`,
      topK: 6,
      types: PURPOSE_TYPES.scope,
    },
    {
      purpose: "risk",
      text: `${signal} risks scope creep technical risk integrations compliance moderation accuracy validation edge cases privacy ${featureTerms} ${brief}`,
      topK: 8,
      types: PURPOSE_TYPES.risk,
    },
    {
      purpose: "proposal",
      text: `${signal} proposal strategy positioning winning angle client message ${featureTerms}`,
      topK: 4,
      types: PURPOSE_TYPES.proposal,
    },
    {
      purpose: "questions",
      text: `${signal} clarification questions missing information assumptions ${featureTerms}`,
      topK: 4,
      types: PURPOSE_TYPES.questions,
    },
  ];
}

function overlapScore(left, right) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let matches = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  });

  return matches / Math.max(1, Math.min(leftTokens.size, 12));
}

function describeRetrieval(record, { classification = {}, purpose, overlap }) {
  const parts = [];

  if (record.category === classification.category) {
    parts.push(`matched ${String(record.category).replace(/_/g, " ")} category`);
  }

  if (record.subcategory === classification.subcategory) {
    parts.push(`matched ${String(record.subcategory).replace(/_/g, " ")} subcategory`);
  }

  if (purpose) {
    parts.push(`retrieved for ${purpose.replace(/_/g, " ")} evidence`);
  }

  if (overlap > 0.2) {
    parts.push("shared important brief terms");
  }

  return parts.length ? parts.join(", ") : "retrieved as a broad bid knowledge reference";
}

function inferPurposeFromType(type) {
  if (type === "pricing_rule") {
    return "pricing";
  }

  if (type === "scope_rule") {
    return "scope";
  }

  if (type === "risk_pattern") {
    return "risk";
  }

  if (type === "proposal_pattern") {
    return "proposal";
  }

  if (type === "question_template") {
    return "questions";
  }

  return "project_case";
}

function toLexicalRecord(entry, { brief, classification }) {
  const searchText = buildSearchableText(entry);
  const purpose = inferPurposeFromType(entry.type);
  const normalizedBrief = normalizeText(`${brief} ${classification.subcategory || ""}`);
  const keywordHit = Array.isArray(entry.trigger_keywords)
    ? entry.trigger_keywords.some((keyword) => normalizedBrief.includes(normalizeText(keyword)))
    : false;
  const exactSubcategory = entry.subcategory === classification.subcategory;
  const overlap = overlapScore(normalizedBrief, searchText);
  const strongLexicalMatch = keywordHit || (exactSubcategory && overlap >= 0.2);

  if (!strongLexicalMatch) {
    return null;
  }

  return scoreRetrievedRecord({
    id: entry.id,
    type: entry.type,
    title:
      entry.title ||
      entry.rule ||
      entry.guideline ||
      entry.risk ||
      entry.question ||
      entry.pattern ||
      entry.id,
    category: entry.category,
    subcategory: entry.subcategory || "general",
    source_file: entry.source_file,
    source_collection: entry.source_collection,
    search_text: searchText,
    similarity: keywordHit ? 0.78 : 0.68,
    metadata: {
      ...entry,
      typical_questions: entry.typical_questions || entry.questions,
    },
  }, {
    brief,
    classification,
    purpose,
  });
}

function getLexicalKnowledgeMatches({ brief = "", classification = {} } = {}) {
  return getAllKnowledgeEntries()
    .filter((entry) =>
      entry.category === classification.category ||
      entry.category === "all" ||
      classification.category === "other",
    )
    .map((entry) => toLexicalRecord(entry, { brief, classification }))
    .filter(Boolean)
    .sort((left, right) => right.retrieval_score - left.retrieval_score)
    .slice(0, 10);
}

function scoreRetrievedRecord(record, { brief, classification, purpose }) {
  const sameCategory = record.category === classification.category;
  const broadRule = record.category === "all";
  const sameSubcategory = record.subcategory === classification.subcategory;
  const hasSpecificSubcategory =
    Boolean(classification.subcategory) &&
    classification.subcategory !== "all" &&
    classification.subcategory !== "general";
  const recordSpecificSubcategory =
    record.subcategory &&
    record.subcategory !== "all" &&
    record.subcategory !== "general";
  const overlap = overlapScore(`${brief} ${classification.subcategory || ""}`, record.search_text);
  const purposeBonus = PURPOSE_TYPES[purpose]?.includes(record.type) ? 0.06 : 0;
  const categoryBonus = sameCategory ? 0.12 : broadRule ? 0.05 : -0.24;
  const subcategoryBonus = sameSubcategory ? 0.16 : 0;
  const subcategoryMismatchPenalty =
    sameCategory &&
    hasSpecificSubcategory &&
    recordSpecificSubcategory &&
    !sameSubcategory
      ? record.type === "project_case"
        ? -0.12
        : -0.09
      : 0;
  const complexityBonus =
    record.metadata?.complexity &&
    classification.complexity_signal &&
    String(record.metadata.complexity).includes(classification.complexity_signal)
      ? 0.04
      : 0;
  const retrievalScore = Math.max(
    0,
    Math.min(
      1,
      Number(record.similarity || 0) * 0.62 +
        categoryBonus +
        subcategoryBonus +
        subcategoryMismatchPenalty +
        purposeBonus +
        overlap * 0.18 +
        complexityBonus,
    ),
  );

  return {
    ...record,
    retrieval_purposes: [purpose],
    retrieval_score: Number(retrievalScore.toFixed(4)),
    why_retrieved: describeRetrieval(record, { classification, purpose, overlap }),
  };
}

function mergeAndRerankResults(batches, { brief, classification, topK }) {
  const byId = new Map();

  batches.flat().forEach((record) => {
    if (!record?.id) {
      return;
    }

    const existing = byId.get(record.id);
    if (!existing || record.retrieval_score > existing.retrieval_score) {
      byId.set(record.id, {
        ...record,
        retrieval_purposes: unique([
          ...(existing?.retrieval_purposes || []),
          ...(record.retrieval_purposes || []),
        ]),
      });
    } else {
      existing.retrieval_purposes = unique([
        ...(existing.retrieval_purposes || []),
        ...(record.retrieval_purposes || []),
      ]);
    }
  });

  return [...byId.values()]
    .filter((record) =>
      !classification.category ||
      classification.category === "other" ||
      record.category === classification.category ||
      record.category === "all",
    )
    .sort((left, right) => right.retrieval_score - left.retrieval_score)
    .slice(0, topK);
}

function summarizeResults(results = []) {
  return results.slice(0, 6).map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    category: item.category,
    subcategory: item.subcategory,
    similarity: item.similarity,
    retrieval_score: item.retrieval_score,
    purposes: item.retrieval_purposes,
  }));
}

async function retrieveKnowledgeForBrief({ brief, classification = {}, requestId, topK = 12 } = {}) {
  const category = classification.category && classification.category !== "other" ? classification.category : undefined;
  const focusedQueries = buildFocusedQueries({ brief, classification });
  logInfo("hybrid_retrieval_start", {
    request_id: requestId,
    category: classification.category,
    subcategory: classification.subcategory,
    complexity_signal: classification.complexity_signal,
    query_count: focusedQueries.length,
    topK,
  });

  const batches = await Promise.all(
    focusedQueries.map(async (query) => {
      const records = await searchVectorIndex(query.text, {
        category,
        topK: query.topK,
        types: query.types,
      });
      logDebug("hybrid_query_result", {
        request_id: requestId,
        purpose: query.purpose,
        requested_topK: query.topK,
        type_filter: query.types,
        result_count: records.length,
        top_results: summarizeResults(records),
      });

      return records.map((record) =>
        scoreRetrievedRecord(record, {
          brief,
          classification,
          purpose: query.purpose,
        }),
      );
    }),
  );
  const lexicalMatches = getLexicalKnowledgeMatches({ brief, classification });
  logDebug("hybrid_lexical_matches", {
    request_id: requestId,
    result_count: lexicalMatches.length,
    top_results: summarizeResults(lexicalMatches),
  });
  const results = mergeAndRerankResults([...batches, lexicalMatches], { brief, classification, topK });
  const ragContext = buildRagContext({ classification, searchResults: results });

  logInfo("hybrid_retrieval_end", {
    request_id: requestId,
    raw_result_count: batches.flat().length,
    lexical_result_count: lexicalMatches.length,
    reranked_count: results.length,
    coverage_level: ragContext.retrieval_quality?.coverage_level,
    close_matches: ragContext.retrieval_quality?.close_matches,
    related_references: ragContext.retrieval_quality?.related_references,
    rules_used: ragContext.retrieval_quality?.rules_used,
    top_results: summarizeResults(results),
  });

  return {
    focused_queries: focusedQueries.map(({ purpose, topK: queryTopK, types }) => ({
      purpose,
      topK: queryTopK,
      types,
    })),
    results,
    ragContext,
  };
}

async function findSimilarProjects({ brief, classification = {}, topK = 5 } = {}) {
  const { ragContext } = await retrieveKnowledgeForBrief({
    brief,
    classification,
    topK: Math.max(topK, 8),
  });

  return ragContext.similar_cases.slice(0, topK);
}

module.exports = {
  buildFocusedQueries,
  findSimilarProjects,
  mergeAndRerankResults,
  retrieveKnowledgeForBrief,
  scoreRetrievedRecord,
};
