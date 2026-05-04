const { classifyProject } = require("./classifier");
const { extractRequirements } = require("./extractor");
const { detectGaps } = require("./gapDetector");
const { refineWithAnswers } = require("./refineService");
const { buildScope } = require("./scopeBuilder");
const { suggestPricing } = require("./pricingEngine");
const { generateProposal } = require("./proposalGenerator");
const { evaluateBidPackage } = require("./bidEvaluator");
const { improveProposal } = require("./proposalImprover");
const { getFeedbackHints } = require("./feedbackService");
const { retrieveKnowledgeForBrief } = require("./similarProjectService");
const { logInfo, logStage } = require("../utils/logger");

const MAX_CRITICAL_QUESTIONS = 3;

function createWorkspaceId() {
  return `workspace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function calculateReadinessScore({ extraction = {}, gaps = {} } = {}) {
  const missingInfoCount = countArray(gaps.missing_info);
  const riskCount = countArray(gaps.risk_flags);
  const questionCount = countArray(gaps.follow_up_questions);
  const assumptionCount = countArray(extraction.assumptions);
  const featureCount = countArray(extraction.features);
  const techReqCount = countArray(extraction.technical_requirements);

  let score = 100;
  score -= missingInfoCount * 8;
  score -= riskCount * 5;
  score -= questionCount * 10;
  score -= assumptionCount * 4;

  if (!extraction.deadline_hint) {
    score -= 6;
  }

  if (!extraction.budget_hint) {
    score -= 6;
  }

  if (featureCount < 2) {
    score -= 8;
  }

  if (techReqCount === 0) {
    score -= 5;
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const blockers = [
    ...(Array.isArray(gaps.missing_info) ? gaps.missing_info.slice(0, 4) : []),
    ...(Array.isArray(gaps.risk_flags) ? gaps.risk_flags.slice(0, 4) : []),
  ];

  return {
    score: boundedScore,
    status:
      boundedScore >= 75 && questionCount <= 1
        ? "ready"
        : boundedScore >= 55
          ? "needs_review"
          : "needs_clarification",
    can_generate: boundedScore >= 55,
    blockers,
  };
}

function inferQuestionImpact(question) {
  const text = `${question.question || ""} ${question.why_important || ""}`.toLowerCase();

  if (/(budget|price|cost|rate|payment|paid)/.test(text)) {
    return "price";
  }

  if (/(deadline|timeline|launch|urgent|rush|week|day|schedule)/.test(text)) {
    return "timeline";
  }

  if (/(risk|legal|security|compliance|data|access|ownership)/.test(text)) {
    return "risk";
  }

  return "scope";
}

function buildDefaultAssumption(question) {
  const impact = inferQuestionImpact(question);
  const assumptionsByImpact = {
    price: "Assume a standard mid-market budget and avoid premium extras unless confirmed.",
    timeline: "Assume a normal delivery timeline with no rush surcharge unless confirmed.",
    scope: "Assume standard launch-ready scope and exclude advanced custom additions unless confirmed.",
    risk: "Assume standard low-risk implementation with no unusual compliance or integration constraints.",
  };

  return assumptionsByImpact[impact];
}

function toCriticalQuestions(gaps = {}) {
  return (Array.isArray(gaps.follow_up_questions) ? gaps.follow_up_questions : [])
    .slice(0, MAX_CRITICAL_QUESTIONS)
    .map((question) => {
      const impact = inferQuestionImpact(question);

      return {
        question: question.question,
        why_it_matters: question.why_important,
        answer_type: question.answer_type,
        choices: Array.isArray(question.choices) ? question.choices : [],
        default_assumption: buildDefaultAssumption(question),
        impact,
      };
    });
}

function buildPostAnswerGaps({ ragContext = {} } = {}) {
  const ragRisks = [
    ...(Array.isArray(ragContext.risk_patterns) ? ragContext.risk_patterns.map((item) => item.rule) : []),
    ...(Array.isArray(ragContext.similar_cases)
      ? ragContext.similar_cases.flatMap((item) => item.risk_flags || [])
      : []),
  ];

  return {
    missing_info: [],
    risk_flags: uniqueStrings(ragRisks).slice(0, 5),
    follow_up_questions: [],
  };
}

function buildConfidence({ classification = {}, extraction = {}, gaps = {}, answersCount = 0 } = {}) {
  const questionCount = Math.min(
    MAX_CRITICAL_QUESTIONS,
    Array.isArray(gaps.follow_up_questions) ? gaps.follow_up_questions.length : 0,
  );
  const missingCount = Array.isArray(gaps.missing_info) ? gaps.missing_info.length : 0;
  const riskCount = Array.isArray(gaps.risk_flags) ? gaps.risk_flags.length : 0;
  const assumptionCount = Array.isArray(extraction.assumptions) ? extraction.assumptions.length : 0;

  let score = Math.round((classification.confidence || 0.7) * 100);
  score -= questionCount * 7;
  score -= Math.min(missingCount, 5) * 3;
  score -= Math.min(riskCount, 5) * 2;
  score -= Math.min(assumptionCount, 5) * 2;

  if (!extraction.budget_hint) {
    score -= 4;
  }

  if (!extraction.deadline_hint) {
    score -= 4;
  }

  score = Math.max(25, Math.min(95, score));

  return {
    score,
    label: score >= 75 ? "High" : score >= 55 ? "Medium" : "Low",
    reason: answersCount > 0
      ? "Your precision boost answers were incorporated, so the bid is ready without more questions."
      : questionCount === 0
        ? "The brief has enough detail to produce a confident first bid."
        : `Generated with clear assumptions; answering ${questionCount} key question${questionCount === 1 ? "" : "s"} can improve accuracy.`,
  };
}

function uniqueStrings(items) {
  return [...new Set(items.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()))];
}

function buildAssumptions(extraction = {}, criticalQuestions = []) {
  return uniqueStrings([
    ...(Array.isArray(extraction.assumptions) ? extraction.assumptions : []),
    ...criticalQuestions.map((question) => question.default_assumption),
  ]);
}

function sanitizeSimilarProjects(projects = []) {
  return projects.slice(0, 3).map((project) => ({
    title: project.title,
    category: project.category,
    subcategory: project.subcategory,
    similarity: project.similarity,
    relevance_explanation: project.relevance_explanation,
    scope_summary: project.scope_summary,
    price_range: project.price_range,
    timeline_days: project.timeline_days,
  }));
}

function buildPackageOptions({ pricing = {}, scope = {} } = {}) {
  const inScope = Array.isArray(scope.in_scope) ? scope.in_scope : [];
  const outOfScope = Array.isArray(scope.out_of_scope) ? scope.out_of_scope : [];

  return {
    basic: {
      label: "Lean MVP",
      scope_summary: pricing.basic?.includes || inScope.slice(0, 2).join(", ") || null,
      proposal_angle: "Position this as the fastest safe version of the project with only the core launch scope.",
      tradeoffs: [
        "Best when budget control matters most.",
        "Advanced features should move to a later phase.",
      ],
      exclusions: outOfScope.slice(0, 4),
      pricing_paragraph: pricing.basic?.min && pricing.basic?.max
        ? `The lean package is $${pricing.basic.min} - $${pricing.basic.max} and should be framed as a controlled MVP.`
        : null,
    },
    recommended: {
      label: "Balanced Bid",
      scope_summary: pricing.recommended?.includes || scope.project_summary || null,
      proposal_angle: "Position this as the best balance of quality, scope protection, and realistic delivery.",
      tradeoffs: [
        "Best default for a serious client-ready bid.",
        "Keeps enough room for QA and practical handoff.",
      ],
      exclusions: outOfScope.slice(0, 4),
      pricing_paragraph: pricing.recommended?.min && pricing.recommended?.max
        ? `The recommended package is $${pricing.recommended.min} - $${pricing.recommended.max}, with scope protected by clear assumptions and exclusions.`
        : null,
    },
    premium: {
      label: "Expanded / Faster Delivery",
      scope_summary: pricing.premium?.includes || scope.project_summary || null,
      proposal_angle: "Position this as the higher-touch option for faster delivery, more polish, or extra support.",
      tradeoffs: [
        "Best when the client wants speed or stronger launch support.",
        "Should not include unconfirmed enterprise-scale features by default.",
      ],
      exclusions: outOfScope.slice(0, 4),
      pricing_paragraph: pricing.premium?.min && pricing.premium?.max
        ? `The premium package is $${pricing.premium.min} - $${pricing.premium.max} and should be sold as added speed, support, or delivery depth.`
        : null,
    },
  };
}

function buildBidStrategy({ classification = {}, extraction = {}, scope = {}, pricing = {}, evaluation = {} } = {}) {
  const categoryLabel = (classification.category || "project").replace(/_/g, " ");
  const recommended = pricing.recommended || {};
  const priceRange =
    Number.isFinite(recommended.min) && Number.isFinite(recommended.max)
      ? `$${recommended.min} - $${recommended.max}`
      : "the recommended package";

  return {
    positioning: extraction.main_deliverable
      ? `Position this as a ${categoryLabel} project focused on ${extraction.main_deliverable}.`
      : null,
    winning_angle: (evaluation.strengths || [])[0] || null,
    delivery_approach: scope.project_summary || null,
    negotiation_advice: priceRange === "the recommended package"
      ? null
      : `Anchor around ${priceRange}, protect the scope with clear exclusions, and treat unanswered questions as assumptions rather than included extras.`,
  };
}

function buildEstimateEvidence({ ragContext = {}, pricing = {}, scope = {}, gaps = {} } = {}) {
  return {
    similar_projects: sanitizeSimilarProjects(ragContext.similar_cases),
    related_references: sanitizeSimilarProjects(ragContext.related_cases),
    pricing_basis: Array.isArray(pricing.pricing_basis) && pricing.pricing_basis.length
      ? pricing.pricing_basis
      : pricing.pricing_notes || [],
    retrieval_quality: ragContext.retrieval_quality || null,
    scope_patterns: [
      ...(Array.isArray(scope.in_scope) ? scope.in_scope.slice(0, 5) : []),
      ...(Array.isArray(scope.out_of_scope) ? scope.out_of_scope.slice(0, 3).map((item) => `Excluded: ${item}`) : []),
    ],
    risks_considered: Array.isArray(gaps.risk_flags) ? gaps.risk_flags.slice(0, 5) : [],
  };
}

function buildAssumptionStrategy({ assumptions = [], criticalQuestions = [] } = {}) {
  return {
    generated_with_assumptions: assumptions.length > 0,
    assumptions,
    accuracy_boosts: criticalQuestions.map((question) => ({
      question: question.question,
      impact: question.impact,
      why_answering_helps: question.why_it_matters,
    })),
    summary:
      criticalQuestions.length > 0
        ? `The package is usable now. Answering ${criticalQuestions.length} optional question${criticalQuestions.length === 1 ? "" : "s"} can tighten pricing, scope, or timeline.`
        : "The brief is detailed enough that no major accuracy questions are needed.",
  };
}

function buildDealSnapshot({ classification = {}, confidence = {}, extraction = {}, preferences = {} } = {}) {
  const category = classification.category ? classification.category.replace(/_/g, " ") : null;
  const difficultyBySize = {
    small: "Low",
    medium: "Moderate",
    large: "High",
  };

  return {
    project_type: category
      ? `${category}${classification.subcategory ? ` / ${classification.subcategory.replace(/_/g, " ")}` : ""}`
      : null,
    buyer_intent:
      extraction.budget_hint || extraction.deadline_hint
        ? "Client has some buying signals in the brief."
        : null,
    urgency: preferences.urgency || extraction.deadline_hint || null,
    estimated_difficulty: difficultyBySize[extraction.project_size] || null,
    bid_confidence: confidence.label || null,
    confidence_score: Number.isFinite(confidence.score) ? confidence.score : null,
  };
}

function buildRecommendedPackage({ pricing = {}, extraction = {}, confidence = {}, preferences = {} } = {}) {
  if (!pricing.recommended?.min || !pricing.recommended?.max) {
    return "recommended";
  }

  if (confidence.score < 65) {
    return "recommended";
  }

  if (confidence.score >= 82 && extraction.project_size === "small") {
    return "basic";
  }

  if ((preferences.urgency || "").toLowerCase() === "rush" && confidence.score >= 70) {
    return "premium";
  }

  if (extraction.project_size === "large" && confidence.score >= 78) {
    return "premium";
  }

  return "recommended";
}

function buildPackageComparison({ pricing = {} } = {}) {
  return {
    basic: pricing.basic?.includes || null,
    recommended: pricing.recommended?.includes || null,
    premium: pricing.premium?.includes || null,
    recommendation_reason: pricing.recommended?.min && pricing.recommended?.max
      ? "Recommended is selected by default because it usually balances price, delivery confidence, and scope protection."
      : null,
  };
}

function splitProposalIntoSections({ proposal = {}, extraction = {}, scope = {}, pricing = {}, assumptions = [] } = {}) {
  const paragraphs =
    typeof proposal.proposal_draft === "string"
      ? proposal.proposal_draft.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean)
      : [];
  const recommended = pricing.recommended || {};

  return {
    opener: paragraphs[0] || null,
    understanding:
      extraction.main_deliverable ||
      paragraphs[1] ||
      null,
    approach:
      scope.project_summary ||
      paragraphs[2] ||
      null,
    timeline: Number.isFinite(scope.total_estimated_days)
      ? `Estimated delivery is ${scope.total_estimated_days} days, subject to feedback and content readiness.`
      : null,
    pricing_paragraph:
      recommended.min && recommended.max
        ? `The recommended package is $${recommended.min} - $${recommended.max}, with scope protected by clear assumptions and exclusions.`
        : null,
    assumptions: assumptions.slice(0, 5),
    next_step: proposal.client_reply || null,
  };
}

function formatMoney(value, currency = "USD") {
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value));
}

function formatTierRange(tier = {}, currency = "USD") {
  const min = formatMoney(tier.min, currency);
  const max = formatMoney(tier.max, currency);

  if (min && max) {
    return `${min} - ${max}`;
  }

  return min || max || null;
}

function buildPackageReply({ baseReply, option = {}, range, tierName }) {
  if (!baseReply || !option.label || !range) {
    return baseReply || null;
  }

  const packageLabel = `${option.label} (${range})`;

  return `${baseReply} Based on the brief, I would likely propose the ${packageLabel} package first.`;
}

function buildPackageSpecificProposals({
  packageOptions = {},
  pricing = {},
  proposal = {},
  proposalSections = {},
} = {}) {
  if (!proposal || !proposal.proposal_draft) {
    return {};
  }

  return ["basic", "recommended", "premium"].reduce((drafts, tierName) => {
    const option = packageOptions[tierName] || {};
    const tier = pricing[tierName] || {};
    const range = formatTierRange(tier, pricing.currency || "USD");

    if (!option.label && !option.scope_summary && !option.proposal_angle && !option.pricing_paragraph && !range) {
      drafts[tierName] = proposal;
      return drafts;
    }

    const scopeLine = option.scope_summary
      ? `For the ${option.label || tierName} package, I would keep the scope focused on: ${option.scope_summary}.`
      : null;
    const angleLine = option.proposal_angle || null;
    const pricingLine = option.pricing_paragraph || (range ? `The ${tierName} package investment is ${range}.` : null);
    const timelineLine = tier.timeline ? `Estimated timeline for this package: ${tier.timeline}.` : proposalSections.timeline;
    const includesLine = tier.includes ? `Included in this package: ${tier.includes}` : null;
    const tradeoffLine = Array.isArray(option.tradeoffs) && option.tradeoffs.length
      ? `Tradeoff to keep clear: ${option.tradeoffs.slice(0, 2).join(" ")}`
      : null;
    const assumptionsLine = Array.isArray(proposalSections.assumptions) && proposalSections.assumptions.length
      ? `Assumptions: ${proposalSections.assumptions.slice(0, 3).join(" ")}`
      : null;
    const exclusionsLine = Array.isArray(option.exclusions) && option.exclusions.length
      ? `Not included unless added later: ${option.exclusions.slice(0, 3).join("; ")}.`
      : null;
    const nextStepLine = "If this package direction looks right, I can confirm the final scope and turn it into a clean statement of work.";

    const draft = [
      proposalSections.opener,
      proposalSections.understanding ? `I understand the goal as: ${proposalSections.understanding}` : null,
      scopeLine,
      angleLine,
      includesLine,
      pricingLine,
      timelineLine,
      assumptionsLine,
      exclusionsLine,
      tradeoffLine,
      nextStepLine,
    ].filter((paragraph) => typeof paragraph === "string" && paragraph.trim()).join("\n\n");

    drafts[tierName] = {
      subject_line: proposal.subject_line,
      proposal_draft: draft || proposal.proposal_draft,
      client_reply: buildPackageReply({
        baseReply: proposal.client_reply,
        option,
        range,
        tierName,
      }),
      package_label: option.label || tierName,
      package_tier: tierName,
    };

    return drafts;
  }, {});
}

function buildRiskPlaybook({ gaps = {}, scope = {} } = {}) {
  const risks = Array.isArray(gaps.risk_flags) ? gaps.risk_flags.slice(0, 5) : [];
  const exclusions = Array.isArray(scope.out_of_scope) ? scope.out_of_scope.slice(0, 5) : [];

  return {
    risks,
    mitigation_wording: risks.map((risk) => `Clarify ${risk.toLowerCase()} before treating it as included scope.`),
    exclusions_to_state: exclusions,
    client_safe_note: risks.length || exclusions.length
      ? "The proposal should stay confident while making assumptions explicit, so the freelancer is protected without sounding defensive."
      : null,
  };
}

function buildEvidenceBoard({ estimateEvidence = {}, ragContext = {}, scope = {} } = {}) {
  return {
    similar_work: estimateEvidence.similar_projects || sanitizeSimilarProjects(ragContext.similar_cases),
    related_references: estimateEvidence.related_references || sanitizeSimilarProjects(ragContext.related_cases),
    pricing_logic: estimateEvidence.pricing_basis || [],
    retrieval_quality: estimateEvidence.retrieval_quality || ragContext.retrieval_quality || null,
    scope_logic: estimateEvidence.scope_patterns || scope.in_scope || [],
    risks_considered: estimateEvidence.risks_considered || [],
    no_close_match: !(estimateEvidence.similar_projects || ragContext.similar_cases || []).length,
  };
}

function isReusableQuickState(previous = {}) {
  return Boolean(
    previous &&
    typeof previous === "object" &&
    previous.classification &&
    previous.extraction &&
    previous.ragContext &&
    Array.isArray(previous.ragContext.source_ids),
  );
}

async function getRagContext(brief, classification, existingContext, requestId) {
  if (existingContext && Array.isArray(existingContext.source_ids)) {
    logInfo("rag_context_reused", {
      request_id: requestId,
      source_count: existingContext.source_ids.length,
      coverage_level: existingContext.retrieval_quality?.coverage_level,
    });
    return { ragContext: existingContext, searchResults: [] };
  }

  const { focused_queries: focusedQueries, results, ragContext } = await retrieveKnowledgeForBrief({
    brief,
    classification,
    requestId,
    topK: 12,
  });

  return { focusedQueries, ragContext, searchResults: results };
}

async function startWorkspace({ brief, preferences = {} }) {
  const classification = await classifyProject(brief);
  const { ragContext, searchResults } = await getRagContext(brief, classification);
  const extraction = await extractRequirements(brief, classification.category, ragContext);
  const gaps = await detectGaps(brief, classification.category, extraction, ragContext);
  const readiness = calculateReadinessScore({ extraction, gaps });

  return {
    workspace_id: createWorkspaceId(),
    stage: gaps.follow_up_questions.length ? "clarification" : "analysis",
    brief,
    preferences,
    classification,
    ragContext,
    search_results: searchResults,
    similar_projects: ragContext.similar_cases,
    extraction,
    gaps,
    readiness,
    refinement_round: 0,
  };
}

async function refineWorkspace({
  workspace_id,
  brief,
  preferences = {},
  classification,
  extraction,
  ragContext,
  userAnswers,
}) {
  const activeClassification = classification || (await classifyProject(brief));
  const { ragContext: activeRagContext } = await getRagContext(brief, activeClassification, ragContext);
  const refinedExtraction = await refineWithAnswers(
    brief,
    activeClassification.category,
    extraction,
    userAnswers,
    activeRagContext,
  );
  const gaps = await detectGaps(
    brief,
    activeClassification.category,
    refinedExtraction,
    activeRagContext,
  );
  const readiness = calculateReadinessScore({ extraction: refinedExtraction, gaps });

  return {
    workspace_id: workspace_id || createWorkspaceId(),
    stage: gaps.follow_up_questions.length ? "clarification" : "analysis",
    brief,
    preferences,
    classification: activeClassification,
    ragContext: activeRagContext,
    similar_projects: activeRagContext.similar_cases,
    extraction: refinedExtraction,
    gaps,
    readiness,
    refinement_round: refinedExtraction.refinement_round,
  };
}

async function generateBidPackage({
  workspace_id,
  brief,
  preferences = {},
  classification,
  extraction,
  ragContext,
}) {
  const activeClassification = classification || (await classifyProject(brief));
  const { ragContext: activeRagContext } = await getRagContext(brief, activeClassification, ragContext);
  const feedbackHints = getFeedbackHints(
    activeClassification.category,
    activeClassification.subcategory,
  );
  const scope = await buildScope(brief, activeClassification.category, extraction, activeRagContext);
  const pricing = await suggestPricing(
    brief,
    activeClassification.category,
    extraction,
    scope,
    activeRagContext,
    preferences,
    feedbackHints,
    { requestId: workspace_id },
  );
  const proposal = await generateProposal(
    brief,
    activeClassification.category,
    extraction,
    scope,
    pricing,
    activeRagContext,
    feedbackHints,
  );
  const evaluation = await evaluateBidPackage({
    brief,
    classification: activeClassification,
    extraction,
    scope,
    pricing,
    proposal,
    ragContext: activeRagContext,
  });

  return {
    workspace_id: workspace_id || createWorkspaceId(),
    stage: "quality_review",
    classification: activeClassification,
    ragContext: activeRagContext,
    similar_projects: activeRagContext.similar_cases,
    feedback_hints: feedbackHints,
    package: {
      scope,
      pricing,
      proposal,
    },
    evaluation,
  };
}

async function quickGenerateBid({ brief, preferences = {}, answers = [], previous = null }) {
  const workspaceId = createWorkspaceId();
  const canReusePrevious = answers.length > 0 && isReusableQuickState(previous);

  logInfo("quick_generate_start", {
    request_id: workspaceId,
    brief_chars: String(brief || "").length,
    answers_count: Array.isArray(answers) ? answers.length : 0,
    reusing_previous: canReusePrevious,
  });

  let classification;
  let focusedQueries = [];
  let ragContext;
  let extraction;

  if (canReusePrevious) {
    classification = previous.classification;
    ragContext = previous.ragContext;
    extraction = previous.extraction;
    logInfo("quick_generate_reuse_previous", {
      request_id: workspaceId,
      previous_workspace_id: previous.workspace_id,
      category: classification.category,
      subcategory: classification.subcategory,
      source_count: Array.isArray(ragContext.source_ids) ? ragContext.source_ids.length : 0,
      coverage_level: ragContext.retrieval_quality?.coverage_level,
    });
  } else {
    classification = await logStage(
      workspaceId,
      "classify",
      () => classifyProject(brief),
    );

    const retrieval = await logStage(
      workspaceId,
      "rag_retrieval",
      () => getRagContext(brief, classification, null, workspaceId),
      {
        category: classification.category,
        subcategory: classification.subcategory,
      },
    );
    focusedQueries = retrieval.focusedQueries || [];
    ragContext = retrieval.ragContext;
  }

  logInfo("rag_query_plan", {
    request_id: workspaceId,
    query_count: Array.isArray(focusedQueries) ? focusedQueries.length : 0,
    purposes: Array.isArray(focusedQueries) ? focusedQueries.map((query) => query.purpose) : [],
  });
  logInfo("rag_retrieval_result", {
    request_id: workspaceId,
    source_count: Array.isArray(ragContext.source_ids) ? ragContext.source_ids.length : 0,
    coverage_level: ragContext.retrieval_quality?.coverage_level,
    close_matches: ragContext.retrieval_quality?.close_matches,
    related_references: ragContext.retrieval_quality?.related_references,
    rules_used: ragContext.retrieval_quality?.rules_used,
    similar_projects: (ragContext.similar_cases || []).slice(0, 3).map((project) => ({
      title: project.title,
      category: project.category,
      subcategory: project.subcategory,
      similarity: project.similarity,
      retrieval_score: project.retrieval_score,
    })),
  });

  if (!extraction) {
    extraction = await logStage(
      workspaceId,
      "extract",
      () => extractRequirements(brief, classification.category, ragContext),
    );
  }
  logInfo("extraction_result", {
    request_id: workspaceId,
    project_size: extraction.project_size,
    client_experience_level: extraction.client_experience_level,
    feature_count: countArray(extraction.features),
    technical_requirement_count: countArray(extraction.technical_requirements),
    assumption_count: countArray(extraction.assumptions),
    has_budget_hint: Boolean(extraction.budget_hint),
    has_deadline_hint: Boolean(extraction.deadline_hint),
  });
  let gaps;

  if (answers.length) {
    extraction = await logStage(
      workspaceId,
      "refine",
      () => refineWithAnswers(
        brief,
        classification.category,
        extraction,
        answers,
        ragContext,
      ),
      { answers_count: answers.length },
    );

    gaps = buildPostAnswerGaps({ ragContext });
    logInfo("post_answer_questions_cleared", {
      request_id: workspaceId,
      answers_count: answers.length,
      retained_risk_count: gaps.risk_flags.length,
    });
  } else {
    gaps = await logStage(
      workspaceId,
      "gaps",
      () => detectGaps(brief, classification.category, extraction, ragContext),
    );
    logInfo("gaps_result", {
      request_id: workspaceId,
      missing_info_count: countArray(gaps.missing_info),
      risk_count: countArray(gaps.risk_flags),
      question_count: countArray(gaps.follow_up_questions),
    });
  }

  const feedbackHints = getFeedbackHints(classification.category, classification.subcategory);
  const scope = await logStage(
    workspaceId,
    "scope",
    () => buildScope(brief, classification.category, extraction, ragContext),
  );
  logInfo("scope_result", {
    request_id: workspaceId,
    total_estimated_days: scope.total_estimated_days,
    milestone_count: countArray(scope.milestones),
    in_scope_count: countArray(scope.in_scope),
    out_of_scope_count: countArray(scope.out_of_scope),
    recommended_revision_rounds: scope.recommended_revision_rounds,
  });

  const pricing = await logStage(
    workspaceId,
    "pricing",
    () => suggestPricing(
      brief,
      classification.category,
      extraction,
      scope,
      ragContext,
      preferences,
      feedbackHints,
      { requestId: workspaceId },
    ),
  );

  logInfo("pricing_result", {
    request_id: workspaceId,
    currency: pricing.currency,
    basic: pricing.basic ? { min: pricing.basic.min, max: pricing.basic.max } : undefined,
    recommended: pricing.recommended ? { min: pricing.recommended.min, max: pricing.recommended.max } : undefined,
    premium: pricing.premium ? { min: pricing.premium.min, max: pricing.premium.max } : undefined,
  });

  const proposal = await logStage(
    workspaceId,
    "proposal",
    () => generateProposal(
      brief,
      classification.category,
      extraction,
      scope,
      pricing,
      ragContext,
      feedbackHints,
    ),
  );
  logInfo("proposal_result", {
    request_id: workspaceId,
    proposal_chars: String(proposal.proposal_draft || "").length,
    quick_message_chars: String(proposal.client_reply || "").length,
    has_subject_line: Boolean(proposal.subject_line),
  });

  const evaluation = await logStage(
    workspaceId,
    "evaluation",
    () => evaluateBidPackage({
      brief,
      classification,
      extraction,
      scope,
      pricing,
      proposal,
      ragContext,
    }),
  );
  logInfo("evaluation_result", {
    request_id: workspaceId,
    overall_score: evaluation.overall_score,
    computed_score: evaluation.computed_score,
    verdict: evaluation.verdict,
    concern_count: countArray(evaluation.concerns),
    recommendation_count: countArray(evaluation.recommendations),
  });
  const criticalQuestions = answers.length ? [] : toCriticalQuestions(gaps);
  const assumptions = buildAssumptions(extraction, criticalQuestions);
  const {
    assumptionStrategy,
    bidStrategy,
    confidence,
    dealSnapshot,
    estimateEvidence,
    evidenceBoard,
    packageComparison,
    proposalSections,
    packageProposals,
    recommendedPackage,
    riskPlaybook,
    packageOptions,
  } = await logStage(
    workspaceId,
    "deal_intelligence",
    async () => {
      const activeBidStrategy = buildBidStrategy({ classification, extraction, scope, pricing, evaluation });
      const activeEstimateEvidence = buildEstimateEvidence({ ragContext, pricing, scope, gaps });
      const activeAssumptionStrategy = buildAssumptionStrategy({ assumptions, criticalQuestions });
      const activeConfidence = buildConfidence({
        classification,
        extraction,
        gaps,
        answersCount: answers.length,
      });
      const activeRecommendedPackage = buildRecommendedPackage({
        pricing,
        extraction,
        confidence: activeConfidence,
        preferences,
      });
      const activeDealSnapshot = buildDealSnapshot({
        classification,
        confidence: activeConfidence,
        extraction,
        preferences,
      });
      const activePackageComparison = buildPackageComparison({ pricing });
      const activeProposalSections = splitProposalIntoSections({
        proposal,
        extraction,
        scope,
        pricing,
        assumptions,
      });
      const activeRiskPlaybook = buildRiskPlaybook({ gaps, scope });
      const activePackageOptions = buildPackageOptions({ pricing, scope });
      const activePackageProposals = buildPackageSpecificProposals({
        packageOptions: activePackageOptions,
        pricing,
        proposal,
        proposalSections: activeProposalSections,
      });
      const activeEvidenceBoard = buildEvidenceBoard({
        estimateEvidence: activeEstimateEvidence,
        ragContext,
        scope,
      });

      return {
        assumptionStrategy: activeAssumptionStrategy,
        bidStrategy: activeBidStrategy,
        confidence: activeConfidence,
        dealSnapshot: activeDealSnapshot,
        estimateEvidence: activeEstimateEvidence,
        evidenceBoard: activeEvidenceBoard,
        packageComparison: activePackageComparison,
        packageOptions: activePackageOptions,
        packageProposals: activePackageProposals,
        proposalSections: activeProposalSections,
        recommendedPackage: activeRecommendedPackage,
        riskPlaybook: activeRiskPlaybook,
      };
    },
    { question_count: criticalQuestions.length },
  );

  logInfo("quick_generate_end", {
    request_id: workspaceId,
    confidence_label: confidence.label,
    confidence_score: confidence.score,
    question_count: criticalQuestions.length,
    recommended_package: recommendedPackage,
    coverage_level: ragContext.retrieval_quality?.coverage_level,
    evaluation_score: evaluation.overall_score,
    pricing_clamped: pricing.pricing_sanity?.clamped,
  });

  return {
    workspace_id: workspaceId,
    brief,
    preferences,
    classification,
    confidence,
    critical_questions: criticalQuestions,
    assumptions,
    similar_projects: estimateEvidence.similar_projects,
    bid_strategy: bidStrategy,
    estimate_evidence: estimateEvidence,
    assumption_strategy: assumptionStrategy,
    deal_snapshot: dealSnapshot,
    recommended_package: recommendedPackage,
    package_comparison: packageComparison,
    package_options: packageOptions,
    package_proposals: packageProposals,
    proposal_sections: proposalSections,
    risk_playbook: riskPlaybook,
    evidence_board: evidenceBoard,
    retrieval_quality: ragContext.retrieval_quality,
    workspace_state: {
      workspace_id: workspaceId,
      classification,
      extraction,
      ragContext,
    },
    package: {
      scope,
      pricing,
      proposal,
    },
    evaluation,
  };
}

async function improveWorkspaceProposal({
  workspace_id,
  brief,
  classification,
  extraction,
  scope,
  pricing,
  proposal,
  evaluation,
  ragContext,
}) {
  const activeClassification = classification || (await classifyProject(brief));
  const { ragContext: activeRagContext } = await getRagContext(brief, activeClassification, ragContext);
  const improvedProposal = await improveProposal({
    brief,
    classification: activeClassification,
    extraction,
    scope,
    pricing,
    proposal,
    evaluation,
    ragContext: activeRagContext,
  });

  return {
    workspace_id: workspace_id || createWorkspaceId(),
    stage: "improved",
    proposal: improvedProposal,
    changes_made: improvedProposal.changes_made,
  };
}

module.exports = {
  calculateReadinessScore,
  buildAssumptionStrategy,
  buildBidStrategy,
  buildDealSnapshot,
  buildEvidenceBoard,
  buildEstimateEvidence,
  buildPackageComparison,
  buildPackageOptions,
  buildPackageSpecificProposals,
  buildPostAnswerGaps,
  buildRecommendedPackage,
  buildRiskPlaybook,
  generateBidPackage,
  improveWorkspaceProposal,
  quickGenerateBid,
  refineWorkspace,
  splitProposalIntoSections,
  startWorkspace,
  toCriticalQuestions,
};
