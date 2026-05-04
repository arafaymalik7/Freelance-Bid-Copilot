const { loadKnowledgeBase, validateKnowledgeBase } = require("../services/knowledgeBaseService");
const {
  assertFakeEmbeddingsAllowed,
  createDeterministicTestEmbedding,
  normalizeEmbeddingText,
  shouldUseFakeEmbeddings,
} = require("../services/embeddingService");
const {
  buildVectorIndex,
  cosineSimilarity,
  getVectorIndexStatus,
  prepareVectorIndex,
  searchVectorIndex,
} = require("../services/vectorSearchService");
const { buildRagContext, summarizeRagContext } = require("../services/ragContextBuilder");
const {
  buildFocusedQueries,
  mergeAndRerankResults,
  retrieveKnowledgeForBrief,
  scoreRetrievedRecord,
} = require("../services/similarProjectService");
const {
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
  calculateReadinessScore,
  splitProposalIntoSections,
  toCriticalQuestions,
} = require("../services/bidWorkspaceService");
const { validateEvaluation } = require("../services/bidEvaluator");
const { validateGaps } = require("../services/gapDetector");
const { validateRefinement } = require("../services/refineService");
const { calculatePriceFactor, updateFeedbackStats } = require("../services/feedbackService");
const {
  applyPricingGuardrails,
  applyRagPricingAnchor,
  calculateRagPriceAnchor,
} = require("../services/pricingEngine");
const { logInfo, sanitizeDetails } = require("../utils/logger");
const { DEFAULT_EMBEDDING_MODEL, isModelNotFound } = require("../utils/geminiClient");
const { extractionFixture, gapsFixture } = require("./fixtures");

describe("RAG knowledge and vector services", () => {
  test("knowledge base JSON files have valid shapes and expected size", () => {
    const result = validateKnowledgeBase();

    expect(result.totalEntries).toBeGreaterThanOrEqual(40);
    expect(result.totalEntries).toBeLessThanOrEqual(120);
    expect(result.counts.projectCases).toBeGreaterThanOrEqual(40);
  });

  test("expanded project cases cover major freelance subcategories", () => {
    const { projectCases } = loadKnowledgeBase();
    const casesById = new Map(projectCases.map((entry) => [entry.id, entry]));
    const expectedCases = [
      ["case_web_real_estate_028", "web_development", "real_estate_site"],
      ["case_web_healthcare_booking_029", "web_development", "booking_site"],
      ["case_web_nonprofit_donation_030", "web_development", "donation_site"],
      ["case_web_marketplace_services_031", "web_development", "marketplace_web_app"],
      ["case_web_ai_chatbot_tool_032", "web_development", "saas_tool"],
      ["case_mobile_health_fitness_033", "mobile_app", "health_fitness_app"],
      ["case_mobile_event_ticketing_034", "mobile_app", "event_ticketing_app"],
      ["case_mobile_logistics_driver_035", "mobile_app", "logistics_app"],
      ["case_mobile_education_quiz_036", "mobile_app", "education_app"],
      ["case_uiux_design_system_037", "ui_ux_design", "design_system"],
      ["case_uiux_checkout_redesign_038", "ui_ux_design", "ecommerce_checkout_design"],
      ["case_content_email_sequence_039", "content_writing", "email_sequence"],
      ["case_content_landing_page_copy_040", "content_writing", "landing_page_copy"],
      ["case_data_churn_analysis_041", "data_analytics", "customer_analysis"],
      ["case_data_migration_cleanup_042", "data_analytics", "data_cleaning_migration"],
      ["case_other_crm_automation_043", "other", "crm_automation"],
    ];

    expectedCases.forEach(([id, category, subcategory]) => {
      const entry = casesById.get(id);

      expect(entry).toBeDefined();
      expect(entry.category).toBe(category);
      expect(entry.subcategory).toBe(subcategory);
      expect(entry.features.length).toBeGreaterThanOrEqual(5);
      expect(entry.typical_questions.length).toBeGreaterThanOrEqual(4);
      expect(entry.risk_flags.length).toBeGreaterThanOrEqual(2);
      expect(entry.price_range.min).toBeGreaterThan(0);
      expect(entry.price_range.max).toBeGreaterThan(entry.price_range.min);
    });
  });

  test("fake embeddings are deterministic and normalized", () => {
    const first = createDeterministicTestEmbedding("ecommerce checkout admin");
    const second = createDeterministicTestEmbedding("ecommerce checkout admin");

    expect(first).toEqual(second);
    expect(first).toHaveLength(64);
    expect(normalizeEmbeddingText("Hello,   WORLD!")).toBe("hello world");
  });

  test("Gemini embedding default uses the supported embedContent model", () => {
    expect(DEFAULT_EMBEDDING_MODEL).toBe("gemini-embedding-001");
    expect(isModelNotFound({ message: "404 model not found" })).toBe(true);
  });

  test("fake embeddings are rejected outside test or index-build context", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalUseFake = process.env.USE_FAKE_EMBEDDINGS;
    const originalIndexBuild = process.env.BIDCOPILOT_INDEX_BUILD;

    process.env.NODE_ENV = "development";
    process.env.USE_FAKE_EMBEDDINGS = "true";
    delete process.env.BIDCOPILOT_INDEX_BUILD;

    expect(() => assertFakeEmbeddingsAllowed()).toThrow(/only allowed/i);

    process.env.BIDCOPILOT_INDEX_BUILD = "true";
    expect(shouldUseFakeEmbeddings()).toBe(true);

    process.env.NODE_ENV = originalNodeEnv;
    if (originalUseFake === undefined) {
      delete process.env.USE_FAKE_EMBEDDINGS;
    } else {
      process.env.USE_FAKE_EMBEDDINGS = originalUseFake;
    }
    if (originalIndexBuild === undefined) {
      delete process.env.BIDCOPILOT_INDEX_BUILD;
    } else {
      process.env.BIDCOPILOT_INDEX_BUILD = originalIndexBuild;
    }
  });

  test("safe logs redact prompts, briefs, responses, and generated proposal content", () => {
    const originalLevel = process.env.BIDCOPILOT_LOG_LEVEL;
    process.env.BIDCOPILOT_LOG_LEVEL = "info";
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    logInfo("stage_start", {
      request_id: "workspace_test",
      stage: "classify",
      brief: "Need a secret ecommerce build",
      prompt: "secret prompt",
      proposal_draft: "secret proposal",
      raw_response: "secret raw response",
      brief_chars: 29,
    });

    const output = spy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(output).toContain("stage_start");
    expect(output).toContain("brief_chars");
    expect(output).not.toContain("secret ecommerce");
    expect(output).not.toContain("secret prompt");
    expect(output).not.toContain("secret proposal");
    expect(output).not.toContain("secret raw response");
    expect(sanitizeDetails({ proposal: { proposal_draft: "x" }, safe: "y" })).toEqual({ safe: "y" });

    spy.mockRestore();
    if (originalLevel === undefined) {
      delete process.env.BIDCOPILOT_LOG_LEVEL;
    } else {
      process.env.BIDCOPILOT_LOG_LEVEL = originalLevel;
    }
  });

  test("cosine similarity handles matching and orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  test("vector search returns sorted top-K results with category/type filtering", async () => {
    const index = await buildVectorIndex({ persist: false });
    const results = await searchVectorIndex("ecommerce checkout admin orders", {
      index,
      category: "web_development",
      types: ["project_case"],
      topK: 3,
    });

    expect(results).toHaveLength(3);
    expect(results.every((item) => item.category === "web_development")).toBe(true);
    expect(results.every((item) => item.type === "project_case")).toBe(true);
    expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
  });

  test("RAG context compacts results without dumping full entries", async () => {
    const index = await buildVectorIndex({ persist: false });
    const results = await searchVectorIndex("dashboard chart KPI cleanup", {
      index,
      topK: 8,
    });
    const ragContext = buildRagContext({
      classification: { category: "data_analytics", subcategory: "dashboard", complexity_signal: "medium" },
      searchResults: results,
    });

    expect(ragContext.source_ids.length).toBeGreaterThan(0);
    expect(summarizeRagContext(ragContext)).toContain("RAG source IDs");
  });

  test("auto index preparation can build a reusable in-memory index", async () => {
    const index = await prepareVectorIndex({ force: true, persist: false });

    expect(index.length).toBeGreaterThanOrEqual(60);
    expect(Array.isArray(getVectorIndexStatus().reasons)).toBe(true);
  });

  test("social mobile knowledge can produce close references while unrelated mobile cases stay related only", async () => {
    const index = await buildVectorIndex({ persist: false });
    const socialCase = index.find((item) => item.id === "case_mobile_social_feed_021");
    const habitCase = index.find((item) => item.id === "case_mobile_habit_007");
    const ragContext = buildRagContext({
      classification: {
        category: "mobile_app",
        subcategory: "social_media_platform",
        complexity_signal: "large",
      },
      searchResults: [
        { ...socialCase, similarity: 0.82 },
        { ...habitCase, similarity: 0.58 },
      ],
    });

    expect(ragContext.similar_cases.some((item) => item.subcategory === "social_media_platform")).toBe(true);
    expect(ragContext.similar_cases.some((item) => item.subcategory === "habit_tracker")).toBe(false);
    expect(ragContext.related_cases.some((item) => item.subcategory === "habit_tracker")).toBe(true);
  });

  test("mobile game knowledge produces exact close evidence and rules", async () => {
    const index = await buildVectorIndex({ persist: false });
    const gameCase = index.find((item) => item.id === "case_mobile_game_025");
    const gameRule = index.find((item) => item.id === "price_mobile_game_mvp");
    const gameRisk = index.find((item) => item.id === "risk_mobile_game_scope");
    const ragContext = buildRagContext({
      classification: {
        category: "mobile_app",
        subcategory: "mobile_game",
        complexity_signal: "large",
      },
      searchResults: [
        { ...gameCase, similarity: 0.84, retrieval_score: 0.84, why_retrieved: "matched mobile game subcategory" },
        { ...gameRule, similarity: 0.78, retrieval_score: 0.78, why_retrieved: "matched mobile game pricing rule" },
        { ...gameRisk, similarity: 0.76, retrieval_score: 0.76, why_retrieved: "matched mobile game risk pattern" },
      ],
    });

    expect(ragContext.similar_cases.some((item) => item.id === "case_mobile_game_025")).toBe(true);
    expect(ragContext.pricing_rules.some((item) => item.id === "price_mobile_game_mvp")).toBe(true);
    expect(ragContext.risk_patterns.some((item) => item.id === "risk_mobile_game_scope")).toBe(true);
    expect(ragContext.retrieval_quality.coverage_level).toBe("strong");
  });

  test("hybrid retrieval builds focused typed queries and quality diagnostics", async () => {
    const queries = buildFocusedQueries({
      brief: "Build a social media mobile app with profiles, feed, likes, comments, and video posts.",
      classification: {
        category: "mobile_app",
        subcategory: "social_media_platform",
        complexity_signal: "large",
      },
    });
    const { ragContext } = await retrieveKnowledgeForBrief({
      brief: "Build a social media mobile app with profiles, feed, likes, comments, and video posts.",
      classification: {
        category: "mobile_app",
        subcategory: "social_media_platform",
        complexity_signal: "large",
      },
      topK: 12,
    });

    expect(queries.map((query) => query.purpose)).toEqual([
      "project_case",
      "pricing",
      "scope",
      "risk",
      "proposal",
      "questions",
    ]);
    expect(ragContext.retrieval_quality.coverage_level).toMatch(/strong|moderate|weak/);
    expect(ragContext.pricing_rules.length).toBeGreaterThan(0);
  });

  test("hybrid retrieval finds exact mobile game evidence instead of unrelated mobile references", async () => {
    const { ragContext } = await retrieveKnowledgeForBrief({
      brief: "Need a 2D mobile game for iOS and Android with levels, scoring, leaderboard, ads, and in-app purchases.",
      classification: {
        category: "mobile_app",
        subcategory: "mobile_game",
        complexity_signal: "large",
      },
      topK: 12,
    });

    expect(ragContext.similar_cases.map((item) => item.id)).toContain("case_mobile_game_025");
    expect(ragContext.pricing_rules.map((item) => item.id)).toContain("price_mobile_game_mvp");
    expect(ragContext.risk_patterns.map((item) => item.id)).toContain("risk_mobile_game_scope");
    expect(ragContext.related_cases.some((item) => item.id === "case_mobile_finance_005")).toBe(false);
    expect(ragContext.retrieval_quality.coverage_level).toBe("strong");
  });

  test("hybrid retrieval finds exact SaaS/parser evidence instead of website-only references", async () => {
    const { ragContext } = await retrieveKnowledgeForBrief({
      brief: "Build a SaaS tool that uploads PDF documents, parses fields, lets users review corrections, and exports CSV.",
      classification: {
        category: "web_development",
        subcategory: "saas_tool",
        complexity_signal: "high",
      },
      topK: 12,
    });

    expect(ragContext.similar_cases.map((item) => item.id)).toContain("case_web_document_parser_027");
    expect(ragContext.pricing_rules.map((item) => item.id)).toContain("price_web_parser_tool_base");
    expect(ragContext.risk_patterns.map((item) => item.id)).toContain("risk_parser_accuracy");
    expect(ragContext.retrieval_quality.coverage_level).toBe("strong");
  });

  test("hybrid retrieval discovers expanded project-case subcategories", async () => {
    const scenarios = [
      {
        brief: "Build a real estate website with MLS property listings, map search, saved homes, agent profiles, and lead forms.",
        classification: {
          category: "web_development",
          subcategory: "real_estate_site",
          complexity_signal: "medium",
        },
        expectedCase: "case_web_real_estate_028",
      },
      {
        brief: "Create a fitness coaching mobile app with workout plans, exercise videos, check-ins, progress tracking, and coach messaging.",
        classification: {
          category: "mobile_app",
          subcategory: "health_fitness_app",
          complexity_signal: "medium",
        },
        expectedCase: "case_mobile_health_fitness_033",
      },
      {
        brief: "Design a SaaS design system in Figma with tokens, components, dashboard patterns, responsive states, and developer handoff.",
        classification: {
          category: "ui_ux_design",
          subcategory: "design_system",
          complexity_signal: "high",
        },
        expectedCase: "case_uiux_design_system_037",
      },
      {
        brief: "Analyze subscription customer churn with cohort retention, cancellation reasons, customer segments, and recommendations.",
        classification: {
          category: "data_analytics",
          subcategory: "customer_analysis",
          complexity_signal: "medium",
        },
        expectedCase: "case_data_churn_analysis_041",
      },
    ];

    for (const scenario of scenarios) {
      const { ragContext } = await retrieveKnowledgeForBrief({
        brief: scenario.brief,
        classification: scenario.classification,
        topK: 12,
      });

      expect(ragContext.similar_cases.map((item) => item.id)).toContain(scenario.expectedCase);
      expect(["moderate", "strong"]).toContain(ragContext.retrieval_quality.coverage_level);
    }
  });

  test("coverage is weak when only broad or unrelated references are available", async () => {
    const index = await buildVectorIndex({ persist: false });
    const businessRule = index.find((item) => item.id === "price_web_business_base");
    const revisionRule = index.find((item) => item.id === "scope_revision_limits");
    const businessCase = index.find((item) => item.id === "case_web_restaurant_002");
    const ragContext = buildRagContext({
      classification: {
        category: "web_development",
        subcategory: "saas_tool",
        complexity_signal: "high",
      },
      searchResults: [
        { ...businessRule, similarity: 0.8, retrieval_score: 0.55 },
        { ...revisionRule, similarity: 0.78, retrieval_score: 0.52 },
        { ...businessCase, similarity: 0.78, retrieval_score: 0.51 },
      ],
    });

    expect(ragContext.similar_cases).toEqual([]);
    expect(ragContext.retrieval_quality.coverage_level).toBe("weak");
    expect(ragContext.retrieval_quality.exact_rule_count).toBe(0);
  });

  test("reranking rejects irrelevant high-vector project cases as close matches", async () => {
    const index = await buildVectorIndex({ persist: false });
    const socialCase = index.find((item) => item.id === "case_mobile_social_feed_021");
    const financeCase = index.find((item) => item.id === "case_mobile_finance_005");
    const classification = {
      category: "mobile_app",
      subcategory: "social_media_platform",
      complexity_signal: "large",
    };
    const ranked = mergeAndRerankResults([
      [
        scoreRetrievedRecord({ ...financeCase, similarity: 0.95 }, {
          brief: "social feed with profiles and media posts",
          classification,
          purpose: "project_case",
        }),
        scoreRetrievedRecord({ ...socialCase, similarity: 0.7 }, {
          brief: "social feed with profiles and media posts",
          classification,
          purpose: "project_case",
        }),
      ],
    ], {
      brief: "social feed with profiles and media posts",
      classification,
      topK: 5,
    });
    const ragContext = buildRagContext({ classification, searchResults: ranked });

    expect(ragContext.similar_cases.some((item) => item.id === "case_mobile_social_feed_021")).toBe(true);
    expect(ragContext.similar_cases.some((item) => item.id === "case_mobile_finance_005")).toBe(false);
  });
});

describe("workspace scoring, evaluator validation, and feedback bounds", () => {
  test("readiness score drops when gaps and assumptions are present", () => {
    const ready = calculateReadinessScore({
      extraction: { ...extractionFixture, assumptions: [], budget_hint: "$3000" },
      gaps: { missing_info: [], risk_flags: [], follow_up_questions: [] },
    });
    const unclear = calculateReadinessScore({ extraction: extractionFixture, gaps: gapsFixture });

    expect(ready.score).toBeGreaterThan(unclear.score);
    expect(unclear.status).not.toBe("ready");
  });

  test("gap, refinement, and quick bid questions are capped at three", () => {
    const manyQuestions = Array.from({ length: 6 }, (_, index) => ({
      question: `Question ${index + 1}?`,
      why_important: "This affects scope.",
      answer_type: "text",
      choices: null,
    }));
    const gaps = validateGaps({
      missing_info: [],
      risk_flags: [],
      follow_up_questions: manyQuestions,
    });
    const refinement = validateRefinement({
      ...extractionFixture,
      refinement_round: 1,
      new_follow_up_questions: manyQuestions,
    });

    expect(gaps.follow_up_questions).toHaveLength(3);
    expect(refinement.new_follow_up_questions).toHaveLength(3);
    expect(toCriticalQuestions(gaps)).toHaveLength(3);
  });

  test("evaluation scores are bounded by dimension weights", () => {
    const result = validateEvaluation({
      overall_score: 120,
      verdict: "Strong with minor gaps",
      scores: {
        scope_clarity: 25,
        pricing_justification: 18,
        risk_coverage: 13,
        missing_info_handling: 12,
        professional_tone: 15,
        rag_grounding: 10,
      },
      strengths: ["Specific scope"],
      concerns: ["Needs one more risk note"],
      recommendations: ["Clarify assets"],
    });

    expect(result.overall_score).toBe(100);
    expect(result.scores.scope_clarity).toBe(20);
    expect(result.computed_score).toBeLessThanOrEqual(100);
  });

  test("feedback price adjustment remains bounded", () => {
    expect(calculatePriceFactor(["too_expensive"], 1, 0.86)).toBe(0.85);
    expect(calculatePriceFactor(["too_cheap"], 5, 1.14)).toBe(1.15);

    const stats = updateFeedbackStats({}, {
      category: "web_development",
      subcategory: "ecommerce_store",
      rating: 5,
      labels: ["too_cheap", "proposal_good"],
      created_at: "2026-01-01T00:00:00.000Z",
    });

    expect(stats["web_development:ecommerce_store"].price_adjustment_factor).toBeGreaterThan(1);
  });

  test("quick bid explainability helpers produce strategy and evidence", () => {
    const criticalQuestions = toCriticalQuestions(gapsFixture);
    const strategy = buildBidStrategy({
      classification: { category: "web_development" },
      extraction: extractionFixture,
      scope: { ...require("./fixtures").scopeFixture },
      pricing: { ...require("./fixtures").pricingFixture },
      evaluation: { strengths: ["Strong ecommerce focus"] },
    });
    const evidence = buildEstimateEvidence({
      ragContext: {
        similar_cases: [
          {
            title: "Boutique ecommerce storefront",
            category: "web_development",
            subcategory: "ecommerce_store",
            similarity: 0.82,
            scope_summary: "Storefront with checkout",
            price_range: { low: 2200, high: 4200 },
          },
        ],
      },
      pricing: require("./fixtures").pricingFixture,
      scope: require("./fixtures").scopeFixture,
      gaps: gapsFixture,
    });
    const assumptionStrategy = buildAssumptionStrategy({
      assumptions: extractionFixture.assumptions,
      criticalQuestions,
    });

    expect(strategy.positioning).toMatch(/web development/i);
    expect(evidence.similar_projects[0].title).toBe("Boutique ecommerce storefront");
    expect(evidence.risks_considered.length).toBeGreaterThan(0);
    expect(assumptionStrategy.accuracy_boosts.length).toBeLessThanOrEqual(3);
  });

  test("deal intelligence helpers produce deal desk fields", () => {
    const confidence = { score: 72, label: "Medium" };
    const snapshot = buildDealSnapshot({
      classification: { category: "web_development", subcategory: "ecommerce_store" },
      confidence,
      extraction: extractionFixture,
      preferences: { urgency: "normal" },
    });
    const recommendedPackage = buildRecommendedPackage({
      pricing: require("./fixtures").pricingFixture,
      extraction: extractionFixture,
      confidence,
    });
    const comparison = buildPackageComparison({ pricing: require("./fixtures").pricingFixture });
    const packageOptions = buildPackageOptions({
      pricing: require("./fixtures").pricingFixture,
      scope: require("./fixtures").scopeFixture,
    });
    const sections = splitProposalIntoSections({
      proposal: require("./fixtures").proposalFixture,
      extraction: extractionFixture,
      scope: require("./fixtures").scopeFixture,
      pricing: require("./fixtures").pricingFixture,
      assumptions: extractionFixture.assumptions,
    });
    const packageProposals = buildPackageSpecificProposals({
      packageOptions,
      pricing: require("./fixtures").pricingFixture,
      proposal: require("./fixtures").proposalFixture,
      proposalSections: sections,
    });
    const playbook = buildRiskPlaybook({ gaps: gapsFixture, scope: require("./fixtures").scopeFixture });
    const evidenceBoard = buildEvidenceBoard({
      estimateEvidence: {
        similar_projects: [{ title: "Boutique ecommerce storefront" }],
        pricing_basis: ["Similar case pricing"],
        scope_patterns: ["Checkout"],
        risks_considered: ["Shipping complexity"],
      },
    });

    expect(snapshot.project_type).toMatch(/web development/i);
    expect(["basic", "recommended", "premium"]).toContain(recommendedPackage);
    expect(comparison.recommendation_reason).toMatch(/Recommended/i);
    expect(packageOptions.basic.label).toBe("Lean MVP");
    expect(packageOptions.premium.proposal_angle).toMatch(/higher-touch/i);
    expect(sections.pricing_paragraph).toMatch(/\$/);
    expect(packageProposals.basic.proposal_draft).toMatch(/Lean MVP/i);
    expect(packageProposals.recommended.proposal_draft).toMatch(/Balanced Bid/i);
    expect(packageProposals.premium.proposal_draft).toMatch(/Expanded \/ Faster Delivery/i);
    expect(packageProposals.basic.proposal_draft).not.toBe(packageProposals.premium.proposal_draft);
    expect(playbook.exclusions_to_state.length).toBeGreaterThan(0);
    expect(evidenceBoard.pricing_logic).toContain("Similar case pricing");
  });

  test("post-answer quick generation stops the question loop and avoids low-confidence premium recommendation", () => {
    const postAnswerGaps = buildPostAnswerGaps({
      ragContext: {
        risk_patterns: [{ rule: "Realtime media scope can expand backend effort." }],
        similar_cases: [{ risk_flags: ["Moderation scope needs explicit exclusion."] }],
      },
    });
    const recommendedPackage = buildRecommendedPackage({
      pricing: require("./fixtures").pricingFixture,
      extraction: { ...extractionFixture, project_size: "large" },
      confidence: { score: 43, label: "Low" },
      preferences: { urgency: "normal" },
    });

    expect(postAnswerGaps.follow_up_questions).toEqual([]);
    expect(postAnswerGaps.risk_flags).toContain("Realtime media scope can expand backend effort.");
    expect(recommendedPackage).toBe("recommended");
  });

  test("deal intelligence helpers avoid fake fallback copy when source data is missing", () => {
    expect(buildBidStrategy()).toEqual({
      positioning: null,
      winning_angle: null,
      delivery_approach: null,
      negotiation_advice: null,
    });
    expect(buildDealSnapshot()).toEqual({
      project_type: null,
      buyer_intent: null,
      urgency: null,
      estimated_difficulty: null,
      bid_confidence: null,
      confidence_score: null,
    });
    expect(buildPackageComparison()).toEqual({
      basic: null,
      recommended: null,
      premium: null,
      recommendation_reason: null,
    });
    expect(splitProposalIntoSections()).toEqual({
      opener: null,
      understanding: null,
      approach: null,
      timeline: null,
      pricing_paragraph: null,
      assumptions: [],
      next_step: null,
    });
  });

  test("pricing guardrails clamp unrealistic mobile estimates and return sanity metadata", () => {
    const pricing = applyPricingGuardrails({
      currency: "USD",
      basic: { min: 60000, max: 85000, includes: "Huge MVP", timeline: "8 weeks" },
      recommended: { min: 90000, max: 130000, includes: "Huge MVP", timeline: "10 weeks" },
      premium: { min: 140000, max: 200000, includes: "Huge MVP", timeline: "12 weeks" },
      hourly_equivalent: 500,
      pricing_notes: [],
      pricing_basis: [],
      what_would_increase_price: [],
    }, {
      brief: "Build a social media app MVP with profiles, feed, posts, likes, and comments.",
      category: "mobile_app",
      extraction: { project_size: "large", features: ["profiles", "feed", "comments"] },
      ragContext: { similar_cases: [{ subcategory: "social_media_platform" }] },
    });

    expect(pricing.recommended.max).toBeLessThanOrEqual(17680);
    expect(pricing.premium.max).toBeLessThanOrEqual(26000);
    expect(pricing.pricing_sanity.clamped).toBe(true);
  });

  test("RAG price anchor produces stable deterministic bands before Gemini wording", () => {
    const ragContext = {
      classification_hint: { category: "mobile_app", subcategory: "social_media_platform" },
      similar_cases: [
        {
          id: "case_mobile_social_feed_021",
          title: "Social media feed MVP",
          subcategory: "social_media_platform",
          price_range: { currency: "USD", min: 6000, max: 18000 },
        },
      ],
      related_cases: [],
      pricing_rules: [
        {
          id: "price_mobile_social_mvp",
          title: "Social media MVP pricing",
          category: "mobile_app",
          subcategory: "social_media_platform",
          base_min: 6000,
          base_max: 18000,
        },
      ],
    };
    const first = calculateRagPriceAnchor({
      brief: "Build a social app MVP with profiles, feed, posts, likes, comments, and moderation.",
      category: "mobile_app",
      extraction: { project_size: "large" },
      preferences: { region: "US/global USD", urgency: "normal" },
      ragContext,
    });
    const second = calculateRagPriceAnchor({
      brief: "Build a social app MVP with profiles, feed, posts, likes, comments, and moderation.",
      category: "mobile_app",
      extraction: { project_size: "large" },
      preferences: { region: "US/global USD", urgency: "normal" },
      ragContext,
    });
    const anchored = applyRagPricingAnchor(require("./fixtures").pricingFixture, first);

    expect(first).toEqual(second);
    expect(first.evidence_count).toBe(2);
    expect(anchored.recommended.max).toBe(first.final_ranges.recommended.max);
    expect(anchored.pricing_basis.join(" ")).toMatch(/Local estimate evidence/i);
  });

  test("RAG price anchor distinguishes exact evidence from weak related references", () => {
    const relatedOnly = calculateRagPriceAnchor({
      brief: "Build a 2D mobile game with levels, scoring, leaderboard, ads, and in-app purchases.",
      category: "mobile_app",
      extraction: { project_size: "large" },
      ragContext: {
        classification_hint: { category: "mobile_app", subcategory: "mobile_game" },
        similar_cases: [],
        related_cases: [
          {
            id: "case_mobile_finance_005",
            title: "Personal finance tracker app",
            subcategory: "finance_tracker",
            price_range: { currency: "USD", min: 2500, max: 6500 },
          },
          {
            id: "case_mobile_community_023",
            title: "Community app for creators",
            subcategory: "community_app",
            price_range: { currency: "USD", min: 4500, max: 14000 },
          },
        ],
        pricing_rules: [
          {
            id: "price_mobile_social_mvp",
            title: "Social media MVP pricing",
            category: "mobile_app",
            subcategory: "social_media_platform",
            base_min: 6000,
            base_max: 18000,
          },
        ],
      },
    });
    const exactGame = calculateRagPriceAnchor({
      brief: "Build a 2D mobile game with levels, scoring, leaderboard, ads, and in-app purchases.",
      category: "mobile_app",
      extraction: { project_size: "large" },
      ragContext: {
        classification_hint: { category: "mobile_app", subcategory: "mobile_game" },
        similar_cases: [
          {
            id: "case_mobile_game_025",
            title: "Casual mobile game MVP",
            subcategory: "mobile_game",
            price_range: { currency: "USD", min: 8000, max: 24000 },
          },
        ],
        related_cases: [
          {
            id: "case_mobile_finance_005",
            title: "Personal finance tracker app",
            subcategory: "finance_tracker",
            price_range: { currency: "USD", min: 2500, max: 6500 },
          },
        ],
        pricing_rules: [
          {
            id: "price_mobile_game_mvp",
            title: "Mobile game MVP pricing",
            category: "mobile_app",
            subcategory: "mobile_game",
            base_min: 8000,
            base_max: 26000,
          },
        ],
      },
    });

    expect(relatedOnly.confidence).toBe("related");
    expect(relatedOnly.exact_signal_count).toBe(0);
    expect(exactGame.confidence).toBe("strong");
    expect(exactGame.exact_signal_count).toBe(2);
    expect(exactGame.source_titles).toEqual(expect.arrayContaining(["Mobile game MVP pricing", "Casual mobile game MVP"]));
  });

  test("RAG price anchor scales SaaS pricing with estimated effort days", () => {
    const ragContext = {
      classification_hint: { category: "web_development", subcategory: "saas_tool" },
      similar_cases: [],
      related_cases: [],
      pricing_rules: [
        {
          id: "price_web_business_base",
          title: "Business website pricing",
          category: "web_development",
          subcategory: "business_website",
          base_min: 700,
          base_max: 2000,
        },
        {
          id: "price_web_ecommerce_base",
          title: "Ecommerce pricing",
          category: "web_development",
          subcategory: "ecommerce_store",
          base_min: 1800,
          base_max: 4500,
        },
      ],
    };
    const shortScope = calculateRagPriceAnchor({
      brief: "Build a SaaS parser tool.",
      category: "web_development",
      extraction: { project_size: "medium" },
      scope: { total_estimated_days: 35 },
      ragContext,
    });
    const longScope = calculateRagPriceAnchor({
      brief: "Build a SaaS parser tool.",
      category: "web_development",
      extraction: { project_size: "medium" },
      scope: { total_estimated_days: 60 },
      ragContext,
    });

    expect(shortScope.confidence).toBe("related");
    expect(longScope.final_ranges.recommended.max).toBeGreaterThan(shortScope.final_ranges.recommended.max);
    expect(longScope.effort_range.days).toBe(60);
    expect(longScope.final_ranges.recommended.max).toBeGreaterThanOrEqual(16800);
  });
});
