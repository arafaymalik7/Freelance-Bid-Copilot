require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env"), quiet: true });

const runLiveTests = process.env.LIVE_GEMINI_TESTS === "1" && Boolean(process.env.GEMINI_API_KEY);
const liveTest = runLiveTests ? test : test.skip;

const {
  generateBidPackage,
  refineWorkspace,
  startWorkspace,
} = require("../services/bidWorkspaceService");

jest.setTimeout(300000);

liveTest("live workspace flow returns structural RAG package output", async () => {
  const brief =
    "I need an ecommerce website for my boutique clothing brand with product pages, customer accounts, Stripe checkout, product variants, and simple order admin. I want launch in about 6 weeks.";

  const started = await startWorkspace({
    brief,
    preferences: { region: "US/global USD", urgency: "normal" },
  });

  expect(started.classification.category).toBeDefined();
  expect(started.ragContext.source_ids.length).toBeGreaterThan(0);
  expect(started.similar_projects.length).toBeGreaterThan(0);
  expect(started.readiness.score).toBeGreaterThanOrEqual(0);

  const answers = started.gaps.follow_up_questions.slice(0, 1).map((question) => ({
    question: question.question,
    answer: "Use Stripe, simple region-based shipping, and basic admin order status updates.",
  }));

  const refined = answers.length
    ? await refineWorkspace({
        workspace_id: started.workspace_id,
        brief,
        preferences: started.preferences,
        classification: started.classification,
        extraction: started.extraction,
        ragContext: started.ragContext,
        userAnswers: answers,
      })
    : started;

  const generated = await generateBidPackage({
    workspace_id: refined.workspace_id,
    brief,
    preferences: refined.preferences,
    classification: refined.classification,
    extraction: refined.extraction,
    ragContext: refined.ragContext,
  });

  expect(generated.package.scope.total_estimated_days).toBeGreaterThan(0);
  expect(generated.package.pricing.basic.max).toBeLessThan(generated.package.pricing.recommended.min);
  expect(generated.package.proposal.proposal_draft.length).toBeGreaterThan(100);
  expect(generated.evaluation.overall_score).toBeGreaterThanOrEqual(0);
});
