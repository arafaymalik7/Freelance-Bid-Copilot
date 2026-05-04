jest.mock("../utils/geminiClient", () => ({
  callGemini: jest.fn(),
}));

const { callGemini } = require("../utils/geminiClient");
const { classifyProject, validateClassification } = require("../services/classifier");
const { classificationFixture } = require("./fixtures");

describe("classifier service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("classifies a web development brief correctly", async () => {
    callGemini.mockResolvedValue(classificationFixture);

    const result = await classifyProject(
      "I need a 5-page website for my bakery with an online menu and contact form.",
    );

    expect(result.category).toBe("web_development");
    expect(result.confidence).toBeGreaterThan(0.6);
    expect(result.typical_stack).toEqual(expect.arrayContaining(["React"]));
  });

  test("throws when the AI response is missing required fields", async () => {
    callGemini.mockResolvedValue({
      category: "web_development",
      reasoning: "Looks like a website project.",
      typical_stack: ["React"],
      pricing_unit: "per_project",
    });

    await expect(classifyProject("Build me a company website")).rejects.toThrow(
      "Incomplete response from AI: missing confidence",
    );
  });

  test("rejects invalid category values", async () => {
    callGemini.mockResolvedValue({
      ...classificationFixture,
      category: "desktop_app",
    });

    await expect(classifyProject("Create a desktop invoicing app")).rejects.toThrow(
      "Incomplete response from AI: missing category",
    );
  });

  test("normalizes SaaS and tool-like web subcategories to saas_tool", () => {
    const result = validateClassification({
      ...classificationFixture,
      category: "web_development",
      subcategory: "AI PDF parser dashboard",
      complexity_signal: "high",
    });

    expect(result.subcategory).toBe("saas_tool");
  });
});
