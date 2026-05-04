jest.mock("../services/bidWorkspaceService", () => ({
  generateBidPackage: jest.fn(),
  improveWorkspaceProposal: jest.fn(),
  quickGenerateBid: jest.fn(),
  refineWorkspace: jest.fn(),
  startWorkspace: jest.fn(),
}));

jest.mock("../services/feedbackService", () => ({
  recordFeedback: jest.fn(),
}));

jest.mock("../services/vectorSearchService", () => ({
  searchVectorIndex: jest.fn(),
}));

const request = require("supertest");
const { createApp } = require("../app");
const {
  generateBidPackage,
  improveWorkspaceProposal,
  quickGenerateBid,
  refineWorkspace,
  startWorkspace,
} = require("../services/bidWorkspaceService");
const { recordFeedback } = require("../services/feedbackService");
const { searchVectorIndex } = require("../services/vectorSearchService");
const {
  classificationFixture,
  extractionFixture,
  gapsFixture,
  pricingFixture,
  proposalFixture,
  scopeFixture,
} = require("./fixtures");

const app = createApp();

const workspacePayload = {
  workspace_id: "workspace_test",
  stage: "clarification",
  brief: "Build an ecommerce store with product pages, Stripe checkout, accounts, and order admin.",
  preferences: { region: "US", urgency: "normal" },
  classification: {
    ...classificationFixture,
    subcategory: "ecommerce_store",
    complexity_signal: "medium",
  },
  ragContext: {
    source_ids: ["case_web_ecommerce_boutique"],
    similar_cases: [],
  },
  similar_projects: [],
  extraction: extractionFixture,
  gaps: gapsFixture,
  readiness: { score: 62, status: "needs_review", can_generate: true, blockers: [] },
  refinement_round: 0,
};

const quickBidPayload = {
  workspace_id: "workspace_quick",
  brief: workspacePayload.brief,
  classification: workspacePayload.classification,
  confidence: {
    score: 72,
    label: "Medium",
    reason: "Generated with assumptions; answering 2 key questions can improve accuracy.",
  },
  critical_questions: [
    {
      question: "Do products need variants?",
      why_it_matters: "Variants affect scope and testing.",
      answer_type: "yes_no",
      choices: [],
      default_assumption: "Assume standard launch-ready scope and exclude advanced custom additions unless confirmed.",
      impact: "scope",
    },
  ],
  assumptions: ["Client will provide product images"],
  similar_projects: [{ title: "Boutique ecommerce storefront", price_range: { low: 2200, high: 4200 } }],
  bid_strategy: {
    positioning: "Position as a focused ecommerce launch.",
    winning_angle: "Lead with premium storefront and reliable checkout.",
    delivery_approach: "Use milestone-based delivery.",
    negotiation_advice: "Anchor around recommended pricing and protect scope.",
  },
  estimate_evidence: {
    similar_projects: [{ title: "Boutique ecommerce storefront", price_range: { low: 2200, high: 4200 } }],
    pricing_basis: ["Similar ecommerce cases support the estimate."],
    scope_patterns: ["Checkout", "Admin order tools"],
    risks_considered: ["Shipping complexity"],
  },
  assumption_strategy: {
    generated_with_assumptions: true,
    assumptions: ["Client will provide product images"],
    accuracy_boosts: [{ question: "Do products need variants?", impact: "scope" }],
    summary: "The package is usable now.",
  },
  deal_snapshot: {
    project_type: "web development / ecommerce store",
    buyer_intent: "Client has some buying signals in the brief.",
    urgency: "normal",
    estimated_difficulty: "Moderate",
    bid_confidence: "Medium",
    confidence_score: 72,
  },
  recommended_package: "recommended",
  package_comparison: {
    basic: "Core storefront and checkout.",
    recommended: "Full storefront, accounts, and admin features.",
    premium: "Rush delivery and extra revision support.",
    recommendation_reason: "Recommended balances price and scope.",
  },
  package_options: {
    basic: {
      label: "Lean MVP",
      scope_summary: "Core storefront and checkout.",
      proposal_angle: "Position this as controlled launch scope.",
      tradeoffs: ["Budget control."],
      exclusions: ["ERP integrations"],
      pricing_paragraph: "The lean package is $1800 - $2400.",
    },
    recommended: {
      label: "Balanced Bid",
      scope_summary: "Full storefront, accounts, and admin workflow.",
      proposal_angle: "Position this as the best balance of scope and quality.",
      tradeoffs: ["Best default."],
      exclusions: ["ERP integrations"],
      pricing_paragraph: "The recommended package is $2600 - $3400.",
    },
    premium: {
      label: "Expanded / Faster Delivery",
      scope_summary: "Accelerated delivery and launch support.",
      proposal_angle: "Position this as higher-touch delivery.",
      tradeoffs: ["Best for speed."],
      exclusions: ["ERP integrations"],
      pricing_paragraph: "The premium package is $3800 - $4800.",
    },
  },
  package_proposals: {
    basic: {
      subject_line: proposalFixture.subject_line,
      proposal_draft: "Lean MVP proposal focused on core storefront and checkout.",
      client_reply: "I would propose the Lean MVP package first.",
      package_label: "Lean MVP",
      package_tier: "basic",
    },
    recommended: {
      subject_line: proposalFixture.subject_line,
      proposal_draft: "Balanced Bid proposal focused on storefront, accounts, admin, and QA.",
      client_reply: "I would propose the Balanced Bid package first.",
      package_label: "Balanced Bid",
      package_tier: "recommended",
    },
    premium: {
      subject_line: proposalFixture.subject_line,
      proposal_draft: "Premium proposal focused on faster delivery and launch support.",
      client_reply: "I would propose the Premium package first.",
      package_label: "Expanded / Faster Delivery",
      package_tier: "premium",
    },
  },
  proposal_sections: {
    opener: "Thanks for sharing the brief.",
    understanding: "A boutique ecommerce website.",
    approach: "Build in milestones.",
    timeline: "Estimated delivery is 15 days.",
    pricing_paragraph: "Recommended package is $2600 - $3200.",
    assumptions: ["Client will provide product images"],
    next_step: "Confirm shipping rules.",
  },
  risk_playbook: {
    risks: ["Shipping complexity"],
    mitigation_wording: ["Clarify shipping complexity before including it."],
    exclusions_to_state: ["ERP integrations"],
    client_safe_note: "Make assumptions explicit.",
  },
  evidence_board: {
    similar_work: [{ title: "Boutique ecommerce storefront" }],
    related_references: [],
    pricing_logic: ["Similar ecommerce cases support the estimate."],
    scope_logic: ["Checkout", "Admin order tools"],
    risks_considered: ["Shipping complexity"],
    no_close_match: false,
  },
  package: {
    scope: scopeFixture,
    pricing: pricingFixture,
    proposal: proposalFixture,
  },
  evaluation: { overall_score: 84, recommendations: ["Clarify variants"] },
};

describe("workspace, feedback, and knowledge routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/workspace/start validates brief length", async () => {
    const response = await request(app).post("/api/workspace/start").send({ brief: "short" });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/brief is required/i);
  });

  test("POST /api/workspace/quick-generate validates brief length", async () => {
    const response = await request(app).post("/api/workspace/quick-generate").send({ brief: "short" });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/brief is required/i);
  });

  test("POST /api/workspace/quick-generate returns complete bid package", async () => {
    quickGenerateBid.mockResolvedValue(quickBidPayload);

    const response = await request(app).post("/api/workspace/quick-generate").send({
      brief: workspacePayload.brief,
      preferences: workspacePayload.preferences,
      answers: [{ question: "Do products need variants?", answer: "Yes" }],
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.package.proposal.subject_line).toBe(proposalFixture.subject_line);
    expect(response.body.confidence.label).toBe("Medium");
    expect(response.body.critical_questions.length).toBeLessThanOrEqual(3);
    expect(response.body.bid_strategy.positioning).toMatch(/ecommerce/i);
    expect(response.body.estimate_evidence.pricing_basis.length).toBeGreaterThan(0);
    expect(response.body.assumption_strategy.generated_with_assumptions).toBe(true);
    expect(response.body.deal_snapshot.project_type).toMatch(/web development/i);
    expect(response.body.recommended_package).toBe("recommended");
    expect(response.body.package_comparison.recommendation_reason).toBeDefined();
    expect(response.body.package_options.recommended.label).toBe("Balanced Bid");
    expect(response.body.package_proposals.basic.proposal_draft).toMatch(/Lean MVP/i);
    expect(response.body.package_proposals.premium.proposal_draft).toMatch(/Premium/i);
    expect(response.body.proposal_sections.pricing_paragraph).toMatch(/\$/);
    expect(response.body.risk_playbook.risks).toContain("Shipping complexity");
    expect(response.body.evidence_board.pricing_logic.length).toBeGreaterThan(0);
    expect(quickGenerateBid).toHaveBeenCalledWith(
      expect.objectContaining({
        answers: [{ question: "Do products need variants?", answer: "Yes" }],
      }),
    );
  });

  test("POST /api/workspace/quick-generate accepts previous state for fast refinement", async () => {
    quickGenerateBid.mockResolvedValue({ ...quickBidPayload, critical_questions: [] });

    const previous = {
      workspace_id: "workspace_quick",
      classification: workspacePayload.classification,
      extraction: extractionFixture,
      ragContext: { source_ids: ["case_web_ecommerce_boutique"], retrieval_quality: { coverage_level: "strong" } },
    };
    const response = await request(app).post("/api/workspace/quick-generate").send({
      brief: workspacePayload.brief,
      preferences: workspacePayload.preferences,
      answers: [{ question: "Do products need variants?", answer: "Yes" }],
      previous,
    });

    expect(response.statusCode).toBe(200);
    expect(quickGenerateBid).toHaveBeenCalledWith(
      expect.objectContaining({
        previous,
      }),
    );
  });

  test("POST /api/workspace/start returns a workspace object", async () => {
    startWorkspace.mockResolvedValue(workspacePayload);

    const response = await request(app)
      .post("/api/workspace/start")
      .send({ brief: workspacePayload.brief, preferences: workspacePayload.preferences });

    expect(response.statusCode).toBe(200);
    expect(response.body.workspace_id).toBe("workspace_test");
    expect(response.body.readiness.score).toBe(62);
  });

  test("POST /api/workspace/refine validates answer array", async () => {
    const response = await request(app).post("/api/workspace/refine").send({
      brief: workspacePayload.brief,
      classification: workspacePayload.classification,
      extraction: extractionFixture,
      userAnswers: "not an array",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe("userAnswers must be an array");
  });

  test("POST /api/workspace/refine returns updated workspace analysis", async () => {
    refineWorkspace.mockResolvedValue({ ...workspacePayload, refinement_round: 1 });

    const response = await request(app).post("/api/workspace/refine").send({
      brief: workspacePayload.brief,
      classification: workspacePayload.classification,
      extraction: extractionFixture,
      ragContext: workspacePayload.ragContext,
      userAnswers: [{ question: "Which gateway?", answer: "Stripe" }],
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.refinement_round).toBe(1);
  });

  test("POST /api/workspace/generate-package returns package and evaluation", async () => {
    generateBidPackage.mockResolvedValue({
      workspace_id: "workspace_test",
      stage: "quality_review",
      package: {
        scope: scopeFixture,
        pricing: pricingFixture,
        proposal: proposalFixture,
      },
      evaluation: { overall_score: 84, recommendations: ["Add source note"] },
    });

    const response = await request(app).post("/api/workspace/generate-package").send({
      brief: workspacePayload.brief,
      classification: workspacePayload.classification,
      extraction: extractionFixture,
      ragContext: workspacePayload.ragContext,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.package.pricing.recommended.min).toBe(pricingFixture.recommended.min);
    expect(response.body.evaluation.overall_score).toBe(84);
  });

  test("POST /api/workspace/improve-proposal returns changes made", async () => {
    improveWorkspaceProposal.mockResolvedValue({
      workspace_id: "workspace_test",
      stage: "improved",
      proposal: { ...proposalFixture, changes_made: ["Clarified exclusions"] },
      changes_made: ["Clarified exclusions"],
    });

    const response = await request(app).post("/api/workspace/improve-proposal").send({
      brief: workspacePayload.brief,
      classification: workspacePayload.classification,
      extraction: extractionFixture,
      ragContext: workspacePayload.ragContext,
      scope: scopeFixture,
      pricing: pricingFixture,
      proposal: proposalFixture,
      evaluation: { recommendations: ["Clarify exclusions"] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.changes_made).toContain("Clarified exclusions");
  });

  test("POST /api/feedback records feedback through service", async () => {
    recordFeedback.mockReturnValue({ accepted: true, hints: { price_adjustment_factor: 1 } });

    const response = await request(app).post("/api/feedback").send({
      workspace_id: "workspace_test",
      category: "web_development",
      subcategory: "ecommerce_store",
      rating: 5,
      labels: ["proposal_good"],
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.accepted).toBe(true);
    expect(recordFeedback).toHaveBeenCalledWith(expect.objectContaining({ rating: 5 }));
  });

  test("GET /api/knowledge/search validates q and returns vector results", async () => {
    searchVectorIndex.mockResolvedValue([
      {
        id: "case_web_ecommerce_boutique",
        type: "project_case",
        title: "Boutique ecommerce storefront",
        category: "web_development",
        subcategory: "ecommerce_store",
        similarity: 0.82,
        source_file: "projectCases.json",
        metadata: { scope_summary: "Storefront and checkout" },
      },
    ]);

    const invalid = await request(app).get("/api/knowledge/search?q=no");
    expect(invalid.statusCode).toBe(400);

    const response = await request(app).get(
      "/api/knowledge/search?q=ecommerce%20checkout&category=web_development&topK=3",
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.results[0].id).toBe("case_web_ecommerce_boutique");
  });
});
