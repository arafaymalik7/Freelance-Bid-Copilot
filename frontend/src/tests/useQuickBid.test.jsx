import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useQuickBid } from "../hooks/useQuickBid.js";
import { quickBidFixture } from "./testFixtures.js";

vi.mock("../api/client.js", () => ({
  quickGenerateBid: vi.fn(),
  submitWorkspaceFeedback: vi.fn(),
}));

import { quickGenerateBid, submitWorkspaceFeedback } from "../api/client.js";

function Harness() {
  const bid = useQuickBid();

  return (
    <div>
      <div data-testid="status">{bid.status}</div>
      <div data-testid="subject">{bid.result?.package.proposal.subject_line ?? ""}</div>
      <div data-testid="questions">{bid.result?.critical_questions.length ?? ""}</div>
      <div data-testid="confidence">{bid.result?.confidence.label ?? ""}</div>
      <div data-testid="feedback">{bid.feedbackReceipt?.accepted ? "saved" : ""}</div>
      <div data-testid="error">{bid.error?.message ?? ""}</div>
      <button
        onClick={() => bid.generateBid("Need a boutique ecommerce website with checkout and accounts.", { region: "US/global USD", urgency: "normal" })}
        type="button"
      >
        generate
      </button>
      <button
        onClick={() => bid.improveWithAnswers([{ question: "Shipping?", answer: "Region based" }])}
        type="button"
      >
        improve
      </button>
      <button onClick={() => bid.submitFeedback({ rating: 5, labels: ["proposal_good"] })} type="button">
        feedback
      </button>
      <button onClick={() => bid.error?.retryFn?.()} type="button">
        retry
      </button>
      <button onClick={bid.reset} type="button">
        reset
      </button>
    </div>
  );
}

describe("useQuickBid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("generates a complete bid in one action", async () => {
    quickGenerateBid.mockResolvedValue(quickBidFixture);

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "generate" }));

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("results"));
    expect(screen.getByTestId("subject")).toHaveTextContent("Proposal for Your Boutique Ecommerce Website");
    expect(screen.getByTestId("confidence")).toHaveTextContent("Medium");
    expect(screen.getByTestId("questions")).toHaveTextContent("2");
  });

  test("uses answers to regenerate without blocking the existing package", async () => {
    const quickBidWithState = {
      ...quickBidFixture,
      workspace_state: {
        workspace_id: "workspace_quick",
        classification: quickBidFixture.classification,
        extraction: { project_size: "medium" },
        ragContext: { source_ids: ["case_web_ecommerce_boutique"] },
      },
    };
    quickGenerateBid.mockResolvedValueOnce(quickBidWithState).mockResolvedValueOnce({
      ...quickBidFixture,
      confidence: { ...quickBidFixture.confidence, label: "High" },
      critical_questions: [],
    });

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "generate" }));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("results"));

    await userEvent.click(screen.getByRole("button", { name: "improve" }));
    await waitFor(() => expect(screen.getByTestId("confidence")).toHaveTextContent("High"));

    expect(quickGenerateBid).toHaveBeenLastCalledWith(
      expect.objectContaining({
        answers: [{ question: "Shipping?", answer: "Region based" }],
        previous: quickBidWithState.workspace_state,
      }),
    );
  });

  test("submits feedback and resets", async () => {
    quickGenerateBid.mockResolvedValue(quickBidFixture);
    submitWorkspaceFeedback.mockResolvedValue({ accepted: true });

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "generate" }));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("results"));

    await userEvent.click(screen.getByRole("button", { name: "feedback" }));
    await waitFor(() => expect(screen.getByTestId("feedback")).toHaveTextContent("saved"));

    await userEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
  });

  test("captures retry state on quick generate error", async () => {
    quickGenerateBid.mockRejectedValueOnce(new Error("API failed")).mockResolvedValueOnce(quickBidFixture);

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "generate" }));
    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("API failed"));

    await userEvent.click(screen.getByRole("button", { name: "retry" }));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("results"));
  });
});
