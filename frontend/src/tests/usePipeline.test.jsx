import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { usePipeline } from "../hooks/usePipeline.js";
import {
  classificationFixture,
  extractionFixture,
  gapsFixture,
  pricingFixture,
  proposalFixture,
  refinedExtractionFixture,
  scopeFixture,
} from "./testFixtures.js";

vi.mock("../api/client.js", () => ({
  classifyBrief: vi.fn(),
  extractRequirements: vi.fn(),
  detectGaps: vi.fn(),
  refineWithAnswers: vi.fn(),
  buildScope: vi.fn(),
  suggestPricing: vi.fn(),
  generateProposal: vi.fn(),
}));

import {
  buildScope,
  classifyBrief,
  detectGaps,
  extractRequirements,
  generateProposal,
  refineWithAnswers,
  suggestPricing,
} from "../api/client.js";

function Harness() {
  const pipeline = usePipeline();

  return (
    <div>
      <div data-testid="brief">{pipeline.brief}</div>
      <div data-testid="step">{pipeline.step}</div>
      <div data-testid="questions-count">{pipeline.gaps?.follow_up_questions.length ?? 0}</div>
      <div data-testid="refinement-round">{pipeline.refinementRound}</div>
      <div data-testid="error-message">{pipeline.error?.message ?? ""}</div>
      <div data-testid="proposal-ready">{pipeline.proposal?.subject_line ?? ""}</div>

      <button onClick={() => pipeline.runFullPipeline("Need a boutique ecommerce website with checkout and accounts.")} type="button">
        run
      </button>
      <button
        onClick={() =>
          pipeline.submitRefinement([{ question: gapsFixture.follow_up_questions[0].question, answer: "Region based" }])
        }
        type="button"
      >
        refine
      </button>
      <button onClick={() => pipeline.continueToProposal()} type="button">
        continue
      </button>
      <button onClick={() => pipeline.error?.retryFn?.()} type="button">
        retry
      </button>
      <button onClick={() => pipeline.resetPipeline()} type="button">
        reset
      </button>
    </div>
  );
}

describe("usePipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("runs the brief through classification, extraction, and question generation", async () => {
    classifyBrief.mockResolvedValue(classificationFixture);
    extractRequirements.mockResolvedValue(extractionFixture);
    detectGaps.mockResolvedValue(gapsFixture);

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "run" }));

    await waitFor(() => expect(screen.getByTestId("step")).toHaveTextContent("3"));
    expect(screen.getByTestId("brief")).toHaveTextContent("Need a boutique ecommerce website");
    expect(screen.getByTestId("questions-count")).toHaveTextContent(String(gapsFixture.follow_up_questions.length));
  });

  test("increments the refinement round and replaces follow-up questions", async () => {
    classifyBrief.mockResolvedValue(classificationFixture);
    extractRequirements.mockResolvedValue(extractionFixture);
    detectGaps.mockResolvedValue(gapsFixture);
    refineWithAnswers.mockResolvedValue(refinedExtractionFixture);

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "run" }));
    await waitFor(() => expect(screen.getByTestId("step")).toHaveTextContent("3"));

    await userEvent.click(screen.getByRole("button", { name: "refine" }));

    await waitFor(() => expect(screen.getByTestId("refinement-round")).toHaveTextContent("1"));
    expect(screen.getByTestId("questions-count")).toHaveTextContent("1");
  });

  test("continues to proposal generation and stores the final outputs", async () => {
    classifyBrief.mockResolvedValue(classificationFixture);
    extractRequirements.mockResolvedValue(extractionFixture);
    detectGaps.mockResolvedValue(gapsFixture);
    buildScope.mockResolvedValue(scopeFixture);
    suggestPricing.mockResolvedValue(pricingFixture);
    generateProposal.mockResolvedValue(proposalFixture);

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "run" }));
    await waitFor(() => expect(screen.getByTestId("step")).toHaveTextContent("3"));

    await userEvent.click(screen.getByRole("button", { name: "continue" }));

    await waitFor(() => expect(screen.getByTestId("step")).toHaveTextContent("7"));
    expect(screen.getByTestId("proposal-ready")).toHaveTextContent("Proposal for Your Boutique Ecommerce Website");
  });

  test("captures retry state on error and reset clears the pipeline", async () => {
    classifyBrief.mockRejectedValueOnce(new Error("API rate limit hit. Please wait a moment and try again."));
    classifyBrief.mockResolvedValueOnce(classificationFixture);
    extractRequirements.mockResolvedValue(extractionFixture);
    detectGaps.mockResolvedValue(gapsFixture);

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "run" }));

    await waitFor(() =>
      expect(screen.getByTestId("error-message")).toHaveTextContent("API rate limit hit. Please wait a moment and try again."),
    );

    await userEvent.click(screen.getByRole("button", { name: "retry" }));
    await waitFor(() => expect(screen.getByTestId("step")).toHaveTextContent("3"));

    await userEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(screen.getByTestId("step")).toHaveTextContent("0");
    expect(screen.getByTestId("brief")).toHaveTextContent("");
  });
});
