jest.mock("../services/classifier", () => ({
  classifyProject: jest.fn(),
}));

jest.mock("../services/extractor", () => ({
  extractRequirements: jest.fn(),
}));

jest.mock("../services/gapDetector", () => ({
  detectGaps: jest.fn(),
}));

jest.mock("../services/refineService", () => ({
  refineWithAnswers: jest.fn(),
}));

jest.mock("../services/scopeBuilder", () => ({
  buildScope: jest.fn(),
}));

jest.mock("../services/pricingEngine", () => ({
  suggestPricing: jest.fn(),
}));

jest.mock("../services/proposalGenerator", () => ({
  generateProposal: jest.fn(),
}));

const request = require("supertest");
const { createApp } = require("../app");
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

const app = createApp();

describe("pipeline routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /health returns ok", async () => {
    const response = await request(app).get("/health");

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.timestamp).toBeDefined();
  });

  test("POST /api/classify validates the brief", async () => {
    const response = await request(app).post("/api/classify").send({ brief: "short" });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/brief is required/i);
  });

  test("POST /api/classify returns the service payload", async () => {
    classifyProject.mockResolvedValue(classificationFixture);

    const response = await request(app)
      .post("/api/classify")
      .send({ brief: "I need a website for my restaurant with online reservations." });

    expect(response.statusCode).toBe(200);
    expect(response.body.category).toBe("web_development");
  });

  test.each([
    ["/api/extract", { brief: "I need a real brief with detail." }, "category is required"],
    ["/api/gaps", { brief: "I need a real brief with detail.", category: "web_development" }, "extraction is required"],
    ["/api/refine", { brief: "I need a real brief with detail.", category: "web_development", previousExtraction: {} }, "userAnswers must be an array"],
    ["/api/scope", { brief: "I need a real brief with detail.", category: "web_development" }, "extraction is required"],
    ["/api/pricing", { brief: "I need a real brief with detail.", category: "web_development", extraction: {} }, "scope is required"],
    ["/api/proposal", { brief: "I need a real brief with detail.", category: "web_development", extraction: {}, scope: {} }, "pricing is required"],
  ])("POST %s validates required fields", async (route, payload, expectedError) => {
    const response = await request(app).post(route).send(payload);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe(expectedError);
  });

  test("POST /api/extract returns extracted requirements", async () => {
    extractRequirements.mockResolvedValue(extractionFixture);

    const response = await request(app).post("/api/extract").send({
      brief: "Build an ecommerce website for my clothing boutique with Stripe checkout.",
      category: "web_development",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.features).toHaveLength(4);
  });

  test("POST /api/gaps returns follow-up questions", async () => {
    detectGaps.mockResolvedValue(gapsFixture);

    const response = await request(app).post("/api/gaps").send({
      brief: "Need a web store for my boutique.",
      category: "web_development",
      extraction: extractionFixture,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.follow_up_questions.length).toBeGreaterThan(0);
  });

  test("POST /api/refine returns a refined extraction", async () => {
    refineWithAnswers.mockResolvedValue(refinedExtractionFixture);

    const response = await request(app).post("/api/refine").send({
      brief: "Need a web store for my boutique.",
      category: "web_development",
      previousExtraction: extractionFixture,
      userAnswers: [{ question: "Do you need shipping by region?", answer: "Yes." }],
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.refinement_round).toBe(1);
  });

  test("POST /api/scope returns the scope document", async () => {
    buildScope.mockResolvedValue(scopeFixture);

    const response = await request(app).post("/api/scope").send({
      brief: "Need a web store for my boutique.",
      category: "web_development",
      extraction: extractionFixture,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.milestones).toHaveLength(4);
  });

  test("POST /api/pricing returns pricing tiers", async () => {
    suggestPricing.mockResolvedValue(pricingFixture);

    const response = await request(app).post("/api/pricing").send({
      brief: "Need a web store for my boutique.",
      category: "web_development",
      extraction: extractionFixture,
      scope: scopeFixture,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.recommended.min).toBeGreaterThan(response.body.basic.max);
  });

  test("POST /api/proposal returns proposal content", async () => {
    generateProposal.mockResolvedValue(proposalFixture);

    const response = await request(app).post("/api/proposal").send({
      brief: "Need a web store for my boutique.",
      category: "web_development",
      extraction: extractionFixture,
      scope: scopeFixture,
      pricing: pricingFixture,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.subject_line).toMatch(/Proposal/);
  });

  test("service errors are normalized by the global handler", async () => {
    classifyProject.mockRejectedValue(new Error("Gemini failed unexpectedly"));

    const response = await request(app)
      .post("/api/classify")
      .send({ brief: "I need a proper website brief with enough detail to validate." });

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe("Something went wrong");
    expect(response.body.detail).toBe("Gemini failed unexpectedly");
  });
});

