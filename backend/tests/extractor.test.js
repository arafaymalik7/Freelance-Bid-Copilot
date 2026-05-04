jest.mock("../utils/geminiClient", () => ({
  callGemini: jest.fn(),
}));

const { callGemini } = require("../utils/geminiClient");
const { extractRequirements } = require("../services/extractor");
const { detectGaps } = require("../services/gapDetector");
const { extractionFixture, gapsFixture } = require("./fixtures");

describe("extractor and gap detector services", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("extracts the main deliverable from a web brief", async () => {
    callGemini.mockResolvedValue(extractionFixture);

    const result = await extractRequirements(
      "I need an ecommerce store for handmade jewelry with 50 products and PayPal checkout.",
      "web_development",
    );

    expect(result.main_deliverable).toMatch(/ecommerce storefront/i);
  });

  test("extracts at least three features", async () => {
    callGemini.mockResolvedValue(extractionFixture);

    const result = await extractRequirements(
      "I need an ecommerce store for handmade jewelry with 50 products and PayPal checkout.",
      "web_development",
    );

    expect(result.features).toHaveLength(4);
  });

  test("deadline_hint stays null when it is not provided", async () => {
    callGemini.mockResolvedValue({
      ...extractionFixture,
      deadline_hint: null,
      main_deliverable: "A logo design package for a startup brand.",
      features: ["Primary logo", "Secondary mark", "Brand color guidance"],
      client_experience_level: "beginner",
      project_size: "small",
    });

    const result = await extractRequirements("I need a simple logo design for my startup.", "ui_ux_design");

    expect(result.deadline_hint).toBeNull();
  });

  test("gap detector returns at most three focused follow-up questions", async () => {
    callGemini.mockResolvedValue(gapsFixture);

    const result = await detectGaps("Need an online store fast", "web_development", extractionFixture);

    expect(result.follow_up_questions.length).toBeGreaterThan(0);
    expect(result.follow_up_questions.length).toBeLessThanOrEqual(3);
    expect(result.follow_up_questions[0].question).toMatch(/\?/);
  });
});
