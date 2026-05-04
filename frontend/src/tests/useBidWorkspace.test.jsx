import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useBidWorkspace } from "../hooks/useBidWorkspace.js";
import {
  evaluationFixture,
  proposalFixture,
  workspaceFixture,
  workspacePackageFixture,
} from "./testFixtures.js";

vi.mock("../api/client.js", () => ({
  startWorkspace: vi.fn(),
  refineWorkspace: vi.fn(),
  generateWorkspacePackage: vi.fn(),
  improveWorkspaceProposal: vi.fn(),
  submitWorkspaceFeedback: vi.fn(),
}));

import {
  generateWorkspacePackage,
  improveWorkspaceProposal,
  refineWorkspace,
  startWorkspace,
  submitWorkspaceFeedback,
} from "../api/client.js";

function Harness() {
  const workspace = useBidWorkspace();

  return (
    <div>
      <div data-testid="stage">{workspace.stage}</div>
      <div data-testid="brief">{workspace.brief}</div>
      <div data-testid="readiness">{workspace.workspace?.readiness?.score ?? ""}</div>
      <div data-testid="round">{workspace.workspace?.refinement_round ?? ""}</div>
      <div data-testid="quality">{workspace.evaluation?.overall_score ?? ""}</div>
      <div data-testid="improved">{workspace.improvedProposal?.subject_line ?? ""}</div>
      <div data-testid="feedback">{workspace.feedbackReceipt?.accepted ? "saved" : ""}</div>
      <div data-testid="error">{workspace.error?.message ?? ""}</div>

      <button
        onClick={() => workspace.startAnalysis("Need a boutique ecommerce website with checkout and accounts.", { region: "US/global USD", urgency: "normal" })}
        type="button"
      >
        start
      </button>
      <button
        onClick={() => workspace.submitClarifications([{ question: "Shipping?", answer: "Region based" }])}
        type="button"
      >
        refine
      </button>
      <button onClick={workspace.generatePackage} type="button">
        package
      </button>
      <button onClick={workspace.improveProposal} type="button">
        improve
      </button>
      <button onClick={() => workspace.submitFeedback({ rating: 5, labels: ["proposal_good"] })} type="button">
        feedback
      </button>
      <button onClick={() => workspace.error?.retryFn?.()} type="button">
        retry
      </button>
      <button onClick={workspace.resetWorkspace} type="button">
        reset
      </button>
    </div>
  );
}

describe("useBidWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("starts analysis and moves to clarification when questions exist", async () => {
    startWorkspace.mockResolvedValue(workspaceFixture);

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "start" }));

    await waitFor(() => expect(screen.getByTestId("stage")).toHaveTextContent("clarification"));
    expect(screen.getByTestId("brief")).toHaveTextContent("boutique ecommerce");
    expect(screen.getByTestId("readiness")).toHaveTextContent("64");
  });

  test("refines workspace and preserves backend-owned refinement round", async () => {
    startWorkspace.mockResolvedValue(workspaceFixture);
    refineWorkspace.mockResolvedValue({
      ...workspaceFixture,
      gaps: { ...workspaceFixture.gaps, follow_up_questions: [] },
      readiness: { score: 82, status: "ready", can_generate: true, blockers: [] },
      refinement_round: 1,
    });

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "start" }));
    await waitFor(() => expect(screen.getByTestId("stage")).toHaveTextContent("clarification"));

    await userEvent.click(screen.getByRole("button", { name: "refine" }));

    await waitFor(() => expect(screen.getByTestId("stage")).toHaveTextContent("analysis"));
    expect(screen.getByTestId("round")).toHaveTextContent("1");
  });

  test("generates package, improves proposal, submits feedback, and resets", async () => {
    startWorkspace.mockResolvedValue(workspaceFixture);
    generateWorkspacePackage.mockResolvedValue(workspacePackageFixture);
    improveWorkspaceProposal.mockResolvedValue({
      proposal: {
        ...proposalFixture,
        subject_line: "Improved Proposal",
        changes_made: ["Clarified risks"],
      },
      changes_made: ["Clarified risks"],
    });
    submitWorkspaceFeedback.mockResolvedValue({ accepted: true });

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "start" }));
    await waitFor(() => expect(screen.getByTestId("stage")).toHaveTextContent("clarification"));

    await userEvent.click(screen.getByRole("button", { name: "package" }));
    await waitFor(() => expect(screen.getByTestId("quality")).toHaveTextContent(String(evaluationFixture.overall_score)));

    await userEvent.click(screen.getByRole("button", { name: "improve" }));
    await waitFor(() => expect(screen.getByTestId("improved")).toHaveTextContent("Improved Proposal"));

    await userEvent.click(screen.getByRole("button", { name: "feedback" }));
    await waitFor(() => expect(screen.getByTestId("feedback")).toHaveTextContent("saved"));

    await userEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(screen.getByTestId("stage")).toHaveTextContent("intake");
  });

  test("captures retry state on API error", async () => {
    startWorkspace.mockRejectedValueOnce(new Error("API failed"));
    startWorkspace.mockResolvedValueOnce(workspaceFixture);

    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "start" }));

    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("API failed"));

    await userEvent.click(screen.getByRole("button", { name: "retry" }));
    await waitFor(() => expect(screen.getByTestId("stage")).toHaveTextContent("clarification"));
  });
});
