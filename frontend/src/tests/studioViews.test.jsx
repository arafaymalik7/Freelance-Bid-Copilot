import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { StudioShell } from "../components/studio/StudioShell.jsx";
import { HomeView } from "../views/HomeView.jsx";
import { KnowledgeView } from "../views/KnowledgeView.jsx";
import { RecentBidsView } from "../views/RecentBidsView.jsx";
import { quickBidFixture } from "./testFixtures.js";

vi.mock("../api/client.js", () => ({
  searchKnowledge: vi.fn(),
}));

import { searchKnowledge } from "../api/client.js";

describe("Bid Studio views", () => {
  test("home view renders studio intro and examples", async () => {
    const onExample = vi.fn();
    render(<HomeView onExample={onExample} onStart={() => {}} />);

    expect(screen.getByText(/serious GenAI workspace/i)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /ecommerce store/i })[0]);
    expect(onExample).toHaveBeenCalledWith(expect.stringContaining("ecommerce store"));
  });

  test("studio shell exposes multi-view navigation", async () => {
    const onNavigate = vi.fn();
    render(
      <StudioShell activeView="home" hasResult onNavigate={onNavigate} onNewBid={() => {}}>
        <p>Shell content</p>
      </StudioShell>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Knowledge" }));
    expect(onNavigate).toHaveBeenCalledWith("knowledge");
    expect(screen.getByText("Shell content")).toBeInTheDocument();
  });

  test("knowledge view searches local RAG records", async () => {
    searchKnowledge.mockResolvedValue({
      results: [
        {
          id: "case_1",
          title: "Boutique ecommerce storefront",
          type: "project_case",
          category: "web_development",
          similarity: 0.82,
          metadata: { scope_summary: "Storefront with checkout and admin" },
        },
      ],
    });

    render(<KnowledgeView result={quickBidFixture} />);
    await userEvent.click(screen.getByRole("button", { name: "Search knowledge" }));

    await waitFor(() => expect(screen.getAllByText("Boutique ecommerce storefront").length).toBeGreaterThan(0));
    expect(searchKnowledge).toHaveBeenCalledWith(
      expect.objectContaining({ category: "web_development", topK: 6 }),
    );
  });

  test("recent bids view opens and clears local bid sessions", async () => {
    const onOpenBid = vi.fn();
    const onClear = vi.fn();
    render(
      <RecentBidsView
        onClear={onClear}
        onOpenBid={onOpenBid}
        onStart={() => {}}
        recentBids={[
          {
            id: "workspace_quick",
            title: "Proposal for Your Boutique Ecommerce Website",
            category: "web_development",
            price_range: { min: 2600, max: 3200 },
            timeline_days: 15,
            result: quickBidFixture,
          },
        ]}
      />,
    );

    expect(screen.getByText("Saved bid sessions")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open bid" }));
    expect(onOpenBid).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Clear recent" }));
    expect(onClear).toHaveBeenCalled();
  });
});
