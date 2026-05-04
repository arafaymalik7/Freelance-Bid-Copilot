jest.mock("../utils/geminiClient", () => ({
  callGemini: jest.fn(),
}));

const { callGemini } = require("../utils/geminiClient");
const { classifyProject } = require("../services/classifier");
const { extractRequirements } = require("../services/extractor");
const { detectGaps } = require("../services/gapDetector");
const { refineWithAnswers } = require("../services/refineService");
const { buildScope } = require("../services/scopeBuilder");
const { suggestPricing } = require("../services/pricingEngine");
const { generateProposal } = require("../services/proposalGenerator");
const {
  classificationFixture,
  extractionFixture,
  gapsFixture,
  pricingFixture,
  proposalFixture,
  refinedExtractionFixture,
  scopeFixture,
} = require("./fixtures");

describe("pipeline integration with mocked Gemini responses", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("full pipeline runs end to end", async () => {
    callGemini
      .mockResolvedValueOnce(classificationFixture)
      .mockResolvedValueOnce(extractionFixture)
      .mockResolvedValueOnce(gapsFixture)
      .mockResolvedValueOnce(scopeFixture)
      .mockResolvedValueOnce(pricingFixture)
      .mockResolvedValueOnce(proposalFixture);

    const brief =
      "I need an ecommerce website for my clothing store with product listings, shopping cart, Stripe payment, and an admin panel to manage orders.";

    const classification = await classifyProject(brief);
    expect(classification.category).toBe("web_development");

    const extraction = await extractRequirements(brief, classification.category);
    expect(extraction.features.length).toBeGreaterThanOrEqual(3);

    const gaps = await detectGaps(brief, classification.category, extraction);
    expect(gaps.follow_up_questions.length).toBeGreaterThanOrEqual(3);

    const scope = await buildScope(brief, classification.category, extraction);
    expect(scope.milestones.length).toBeGreaterThanOrEqual(3);
    expect(scope.total_estimated_days).toBeGreaterThan(0);

    const pricing = await suggestPricing(brief, classification.category, extraction, scope);
    expect(pricing.basic.max).toBeLessThan(pricing.recommended.min);
    expect(pricing.recommended.max).toBeLessThan(pricing.premium.min);

    const proposal = await generateProposal(brief, classification.category, extraction, scope, pricing);
    expect(proposal.proposal_draft.length).toBeGreaterThan(100);
    expect(proposal.client_reply.length).toBeGreaterThan(30);
  });

  test("handles an extremely vague brief without crashing", async () => {
    callGemini
      .mockResolvedValueOnce({ ...classificationFixture, category: "mobile_app", reasoning: "The brief mentions an app." })
      .mockResolvedValueOnce({
        ...extractionFixture,
        main_deliverable: "A simple mobile app concept with core functionality still to be defined.",
        project_size: "small",
      })
      .mockResolvedValueOnce({
        ...gapsFixture,
        follow_up_questions: gapsFixture.follow_up_questions.slice(0, 3),
      });

    const brief = "need app how much";
    const classification = await classifyProject(brief);
    const extraction = await extractRequirements(brief, classification.category);
    const gaps = await detectGaps(brief, classification.category, extraction);

    expect(classification.category).toBeDefined();
    expect(extraction.main_deliverable).toBeDefined();
    expect(gaps.follow_up_questions.length).toBeGreaterThanOrEqual(3);
  });

  test("refinement round increments correctly", async () => {
    callGemini
      .mockResolvedValueOnce({ ...classificationFixture, category: "mobile_app" })
      .mockResolvedValueOnce({
        ...extractionFixture,
        main_deliverable: "A food delivery mobile app MVP.",
        project_size: "large",
      })
      .mockResolvedValueOnce(refinedExtractionFixture);

    const brief = "I need a mobile app for food delivery.";
    const classification = await classifyProject(brief);
    const extraction = await extractRequirements(brief, classification.category);
    const refined = await refineWithAnswers(brief, classification.category, extraction, [
      { question: "iOS or Android?", answer: "Both platforms" },
    ]);

    expect(refined.refinement_round).toBe(1);
    expect(refined.features.length).toBeGreaterThanOrEqual(extraction.features.length);
  });

  test("proposal draft is at least 150 words", async () => {
    callGemini
      .mockResolvedValueOnce(classificationFixture)
      .mockResolvedValueOnce(extractionFixture)
      .mockResolvedValueOnce(scopeFixture)
      .mockResolvedValueOnce(pricingFixture)
      .mockResolvedValueOnce(proposalFixture);

    const brief = "I need a portfolio website with 5 pages and a contact form.";
    const classification = await classifyProject(brief);
    const extraction = await extractRequirements(brief, classification.category);
    const scope = await buildScope(brief, classification.category, extraction);
    const pricing = await suggestPricing(brief, classification.category, extraction, scope);
    const proposal = await generateProposal(brief, classification.category, extraction, scope, pricing);

    expect(proposal.proposal_draft.split(/\s+/).length).toBeGreaterThan(150);
    expect(proposal.client_reply.length).toBeGreaterThan(50);
  });
});
