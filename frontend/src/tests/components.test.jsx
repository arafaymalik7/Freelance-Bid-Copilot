import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PricingCard } from "../components/PricingCard.jsx";
import { ProposalCard } from "../components/ProposalCard.jsx";
import { AnalysisPanel } from "../components/workspace/AnalysisPanel.jsx";
import { BidPackagePanel } from "../components/workspace/BidPackagePanel.jsx";
import { FeedbackPanel } from "../components/workspace/FeedbackPanel.jsx";
import { SmartIntake } from "../components/workspace/SmartIntake.jsx";
import { SummaryBar } from "../components/workspace/WorkspaceChrome.jsx";
import { QuickBidIntake } from "../components/quick/QuickBidIntake.jsx";
import { QuickBidResults } from "../components/quick/QuickBidResults.jsx";
import {
  evaluationFixture,
  pricingFixture,
  proposalFixture,
  quickBidFixture,
  workspaceFixture,
  workspacePackageFixture,
} from "./testFixtures.js";

describe("frontend components", () => {
  test("renders the recommended pricing tier and notes", () => {
    render(<PricingCard pricing={pricingFixture} />);

    expect(screen.getByText(/Recommended/)).toBeInTheDocument();
    expect(screen.getByText("$2600 - $3200")).toBeInTheDocument();
    expect(screen.getByText(/Use staged payments/i)).toBeInTheDocument();
  });

  test("copies proposal content to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    globalThis.navigator.clipboard.writeText = writeText;

    render(
      <ProposalCard
        category="web_development"
        onStartOver={() => {}}
        projectSize="medium"
        proposal={proposalFixture}
        recommendedRange={[2600, 3200]}
        sectionId="proposal-section"
        totalEstimatedDays={15}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Copy to Clipboard" }));

    expect(writeText).toHaveBeenCalledWith(proposalFixture.proposal_draft);
  });

  test("smart intake submits selected example and preferences", async () => {
    const onSubmit = vi.fn();
    render(<SmartIntake loading={false} onSubmit={onSubmit} />);

    await userEvent.click(screen.getAllByRole("button", { name: /Build a Shopify-style/i })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Start RAG Workspace" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.stringContaining("ecommerce store"),
      expect.objectContaining({ region: "US/global USD", urgency: "normal" }),
    );
  });

  test("summary bar and analysis panel render readiness, similar projects, and RAG sources", () => {
    render(
      <>
        <SummaryBar evaluation={null} workspace={workspaceFixture} />
        <AnalysisPanel
          loading={false}
          onGeneratePackage={() => {}}
          onSubmitClarifications={() => {}}
          workspace={workspaceFixture}
        />
      </>,
    );

    expect(screen.getAllByText("64/100").length).toBeGreaterThan(0);
    expect(screen.getByText("Boutique ecommerce storefront")).toBeInTheDocument();
    expect(screen.getByText("case_web_ecommerce_boutique")).toBeInTheDocument();
  });

  test("bid package panel renders quality score and copies improved proposal", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    globalThis.navigator.clipboard.writeText = writeText;

    render(
      <BidPackagePanel
        bidPackage={workspacePackageFixture.package}
        evaluation={evaluationFixture}
        improvedProposal={{ ...proposalFixture, subject_line: "Improved", changes_made: ["Tighter risk wording"] }}
        loading={false}
        onImproveProposal={() => {}}
      />,
    );

    expect(screen.getByText("84")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Proposal" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy Proposal" }));

    expect(writeText).toHaveBeenCalledWith(proposalFixture.proposal_draft);
  });

  test("feedback panel submits rating and labels", async () => {
    const onSubmitFeedback = vi.fn();
    render(<FeedbackPanel loading={false} onSubmitFeedback={onSubmitFeedback} receipt={null} />);

    await userEvent.click(screen.getByRole("button", { name: "Too vague" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit Feedback" }));

    expect(onSubmitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5, labels: expect.arrayContaining(["proposal_good", "too_vague"]) }),
    );
  });

  test("quick intake generates a bid from an example in one action", async () => {
    const onGenerate = vi.fn();
    render(<QuickBidIntake loading={false} onGenerate={onGenerate} />);

    await userEvent.click(screen.getAllByRole("button", { name: /ecommerce website/i })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Generate Bid" }));

    expect(onGenerate).toHaveBeenCalledWith(
      expect.stringContaining("ecommerce website"),
      expect.objectContaining({ region: "US/global USD", urgency: "normal" }),
    );
  });

  test("quick results render package tabs, max three questions, evidence panel, and copy buttons", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    globalThis.navigator.clipboard.writeText = writeText;

    render(
      <QuickBidResults
        feedbackReceipt={null}
        loading={false}
        onImproveWithAnswers={() => {}}
        onNewBrief={() => {}}
        onSubmitFeedback={() => {}}
        result={{ ...quickBidFixture, critical_questions: [...quickBidFixture.critical_questions] }}
      />,
    );

    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("$2600 - $3200")).toBeInTheDocument();
    expect(screen.getAllByText(/Do products need/i).length).toBeLessThanOrEqual(1);

    await userEvent.click(screen.getByRole("button", { name: "Pricing" }));
    expect(screen.getByText("What could change the price")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show estimate evidence" }));
    expect(screen.getByText("Boutique ecommerce storefront")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Proposal" }));
    await userEvent.click(screen.getByRole("button", { name: "Copy proposal" }));
    expect(writeText).toHaveBeenCalledWith(proposalFixture.proposal_draft);
  });

  test("quick results allow skipping optional questions and submitting simple feedback", async () => {
    const onSubmitFeedback = vi.fn();
    render(
      <QuickBidResults
        feedbackReceipt={null}
        loading={false}
        onImproveWithAnswers={() => {}}
        onNewBrief={() => {}}
        onSubmitFeedback={onSubmitFeedback}
        result={quickBidFixture}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Skip questions" }));
    expect(screen.getByText(/The bid is ready/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Useful" }));
    expect(onSubmitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5, labels: ["proposal_good"] }),
    );
  });
});
