import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { BriefInbox } from "../components/deal/BriefInbox.jsx";
import { DealRoom } from "../components/deal/DealRoom.jsx";
import { quickBidFixture } from "./testFixtures.js";

function renderDealRoom(overrides = {}) {
  const props = {
    feedbackReceipt: null,
    loading: false,
    onImproveWithAnswers: vi.fn(),
    onNewBid: vi.fn(),
    onSaveBid: vi.fn(),
    onShowRecent: vi.fn(),
    onSubmitFeedback: vi.fn(),
    recentBids: [
      {
        id: "recent_1",
        title: "Recent Ecommerce Bid",
        category: "web_development",
        timeline_days: 15,
        result: quickBidFixture,
      },
    ],
    result: quickBidFixture,
    ...overrides,
  };

  render(<DealRoom {...props} />);

  return props;
}

describe("Deal Desk experience", () => {
  test("brief inbox is focused, has no demo brief cards, and opens recent deals", async () => {
    const onGenerate = vi.fn();
    const onShowRecent = vi.fn();

    render(
      <BriefInbox
        loading={false}
        onGenerate={onGenerate}
        onShowRecent={onShowRecent}
        recentBids={[
          {
            id: "workspace_quick",
            title: "Proposal for Your Boutique Ecommerce Website",
            category: "web_development",
            result: quickBidFixture,
          },
        ]}
      />,
    );

    expect(screen.getByText("Paste the client brief")).toBeInTheDocument();
    expect(screen.queryByText(/Build an ecommerce store/i)).not.toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText("Paste the real client message here..."),
      "Need a real ecommerce website brief with checkout, accounts, and order admin.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Generate Bid" }));

    expect(onGenerate).toHaveBeenCalledWith(
      expect.stringContaining("real ecommerce website"),
      expect.objectContaining({ region: "US/global USD", urgency: "normal" }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Recent bids" }));
    expect(onShowRecent).toHaveBeenCalled();
  });

  test("deal room renders proposal first and keeps evidence and boosts collapsed", async () => {
    renderDealRoom();

    expect(screen.getByText("Client-ready proposal")).toBeInTheDocument();
    expect(screen.getAllByText("$2,600 - $3,200").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Evidence Board/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Precision Boosts/i })).toBeInTheDocument();
    expect(screen.queryByText("Close similar projects")).not.toBeInTheDocument();
    expect(screen.queryByText(/Do products need size and color variants/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Evidence Board/i }));
    expect(screen.getByText("Knowledge coverage")).toBeInTheDocument();
    expect(screen.getAllByText("strong").length).toBeGreaterThan(0);
    expect(screen.getByText("Close similar projects")).toBeInTheDocument();
    expect(screen.getByText("Boutique ecommerce storefront")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Precision Boosts/i }));
    expect(screen.getByText(/Do products need size and color variants/i)).toBeInTheDocument();
  });

  test("package switching changes price, scope, and proposal framing", async () => {
    renderDealRoom();

    expect(screen.getByText(/Recommended - \$2,600 - \$3,200/)).toBeInTheDocument();
    expect(screen.getByText("Recommended package focus")).toBeInTheDocument();
    expect(screen.getAllByText("Balanced Bid").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: /Premium/i }));

    expect(screen.getByText(/Premium - \$3,600 - \$4,400/)).toBeInTheDocument();
    expect(screen.getByText("Premium package focus")).toBeInTheDocument();
    expect(screen.getAllByText("Expanded / Faster Delivery").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/higher-touch option for speed, polish, and launch support/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/fastest safe version with only the launch essentials/i)).not.toBeInTheDocument();
  });

  test("precision boosts regenerate the bid with answered questions and can be skipped", async () => {
    const onImproveWithAnswers = vi.fn();
    renderDealRoom({ onImproveWithAnswers });

    await userEvent.click(screen.getByRole("button", { name: /Precision Boosts/i }));
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    await userEvent.click(screen.getByRole("button", { name: "Improve with answers" }));

    expect(onImproveWithAnswers).toHaveBeenCalledWith([
      {
        question: "Do products need size and color variants?",
        answer: "Yes",
      },
    ]);

    await userEvent.click(screen.getByRole("button", { name: "Skip boosts" }));
    expect(screen.queryByText(/Do products need size and color variants/i)).not.toBeInTheDocument();
  });

  test("copy, save, feedback, new brief, and recent deal actions are wired", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    globalThis.navigator.clipboard.writeText = writeText;
    const props = renderDealRoom();

    await userEvent.click(screen.getByRole("button", { name: "Copy proposal" }));
    expect(writeText).toHaveBeenCalledWith(quickBidFixture.package_proposals.recommended.proposal_draft);

    expect(screen.getByText("Opening reply")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Copy opening reply" }));
    expect(writeText).toHaveBeenCalledWith(quickBidFixture.package_proposals.recommended.client_reply);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(props.onSaveBid).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Useful" }));
    expect(props.onSubmitFeedback).toHaveBeenCalledWith({ rating: 5, labels: ["proposal_good"] });

    await userEvent.click(screen.getByRole("button", { name: "New brief" }));
    expect(props.onNewBid).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Recent" }));
    expect(props.onShowRecent).toHaveBeenCalled();
  });

  test("missing required package data shows an error instead of fake placeholders", () => {
    renderDealRoom({
      result: {
        ...quickBidFixture,
        package: {
          ...quickBidFixture.package,
          proposal: { ...quickBidFixture.package.proposal, proposal_draft: "" },
        },
      },
    });

    expect(screen.getByText("Bid package incomplete")).toBeInTheDocument();
    expect(screen.queryByText(/TBD|unavailable|Generated strategy/i)).not.toBeInTheDocument();
  });

  test("evidence board shows no-close-match message and never renders null ranges", async () => {
    renderDealRoom({
      result: {
        ...quickBidFixture,
        similar_projects: [],
        evidence_board: {
          ...quickBidFixture.evidence_board,
          similar_work: [],
          related_references: [
            {
              title: "Related mobile app case",
              relevance_explanation: "Related category reference only.",
              price_range: { currency: "USD", min: null, max: null },
            },
          ],
          no_close_match: true,
        },
      },
    });

    await userEvent.click(screen.getByRole("button", { name: /Evidence Board/i }));
    expect(screen.getByText(/No close project case found/i)).toBeInTheDocument();
    expect(screen.getByText("Related category references")).toBeInTheDocument();
    expect(screen.queryByText(/null - null/i)).not.toBeInTheDocument();
  });
});
