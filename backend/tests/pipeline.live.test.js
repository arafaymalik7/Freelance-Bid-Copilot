require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const runLiveTests = process.env.LIVE_GEMINI_TESTS === "1" && Boolean(process.env.GEMINI_API_KEY);
const liveTest = runLiveTests ? test : test.skip;

const { classifyProject } = require("../services/classifier");
const { extractRequirements } = require("../services/extractor");
const { detectGaps } = require("../services/gapDetector");
const { refineWithAnswers } = require("../services/refineService");
const { buildScope } = require("../services/scopeBuilder");
const { suggestPricing } = require("../services/pricingEngine");
const { generateProposal } = require("../services/proposalGenerator");

jest.setTimeout(240000);

liveTest("live classifier smoke test", async () => {
  const result = await classifyProject(
    "I need a portfolio website for my architecture studio with case studies, a contact form, and a clean premium feel.",
  );

  expect(result.category).toBe("web_development");
  expect(result.confidence).toBeGreaterThan(0.5);
});

liveTest("live full pipeline with one refinement round", async () => {
  const brief =
    "I need an ecommerce website for my boutique clothing brand with product pages, customer accounts, Stripe checkout, and a simple admin area for orders. I want it to feel premium and launch within about 6 weeks.";

  const classification = await classifyProject(brief);
  const extraction = await extractRequirements(brief, classification.category);
  const gaps = await detectGaps(brief, classification.category, extraction);

  const answers = gaps.follow_up_questions.slice(0, 2).map((question, index) => ({
    question: question.question,
    answer:
      index === 0
        ? "Use a custom dashboard with simple order updates only."
        : "Yes, products will have size and color variants.",
  }));

  const refined = await refineWithAnswers(brief, classification.category, extraction, answers);
  const scope = await buildScope(brief, classification.category, refined);
  const pricing = await suggestPricing(brief, classification.category, refined, scope);
  const proposal = await generateProposal(brief, classification.category, refined, scope, pricing);

  expect(refined.refinement_round).toBe(1);
  expect(scope.total_estimated_days).toBeGreaterThan(0);
  expect(pricing.basic.max).toBeLessThan(pricing.recommended.min);
  expect(pricing.recommended.max).toBeLessThan(pricing.premium.min);
  expect(proposal.proposal_draft.split(/\s+/).length).toBeGreaterThan(60);
  expect(proposal.client_reply.length).toBeGreaterThan(40);
});
