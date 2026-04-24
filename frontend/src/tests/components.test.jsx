import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PricingCard } from "../components/PricingCard.jsx";
import { ProposalCard } from "../components/ProposalCard.jsx";
import { pricingFixture, proposalFixture } from "./testFixtures.js";

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
});
