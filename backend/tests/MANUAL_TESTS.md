# Manual Test Scenarios

1. Open the app and confirm the first screen is a focused `Brief Inbox`, not a multi-page dashboard, wizard, or marketing-heavy page.
2. Paste a real client brief and confirm one action opens the `Deal Room` with a complete bid before answering questions.
3. Paste a detailed ecommerce brief and confirm the center document shows proposal, pricing, scope timeline, assumptions, and quick client message.
4. Paste a vague mobile app brief and confirm the app still generates a usable bid with assumptions and max 3 optional precision boosts.
5. Switch between `Basic`, `Recommended`, and `Premium` packages and confirm the selected price, package focus, pricing paragraph, tradeoffs, and scope summary update without losing the document.
6. Answer one or more precision boosts and confirm regeneration improves the deal instead of blocking progress.
7. Skip precision boosts and confirm the ready bid remains visible and usable.
8. Open the collapsed `Evidence Board` and confirm it shows close similar projects only when they are relevant, related category references separately, pricing logic, scope logic, risks, and assumptions without raw source IDs dominating the UI.
9. Save a generated bid, reopen it from the recent bids drawer, and confirm the Deal Room restores correctly.
10. Test the app at 375px width and confirm the Deal Room stacks cleanly with no horizontal overflow.
11. Run `npm run dev` from the repo root and confirm backend and frontend start together.
12. Confirm backend startup logs show `index_ready` or `index_build_start` / `index_build_end` without requiring a manual vector-index command.
13. Paste a social/mobile app brief and confirm irrelevant finance/habit/delivery records are not shown as `Close similar projects`; if no strong close case exists, the app says no close case was found.
14. Confirm the Evidence Board never renders `null - null` for missing price or timeline data.
15. Confirm terminal logs show safe stage/timing/RAG/Gemini monitoring without full briefs, prompts, raw responses, proposal drafts, quick client messages, or API keys.
