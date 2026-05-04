# Freelancer Bid Copilot - Current App Documentation

## Current Product

Freelancer Bid Copilot is now a Deal Desk: a RAG-powered bidding workspace that opens a single AI deal room from a client brief. The primary user flow is:

```text
Brief Inbox -> Open Deal Room -> Review client-ready bid -> Optionally answer max 3 precision boosts -> Copy / Save
```

The app still uses the RAG backend built for Bid Copilot 2.0, but the UI no longer behaves like pages, tabs, or a pipeline. Users get a complete bid first: recommended package, price tiers, package-specific scope, proposal draft, quick client message, and collapsible estimate evidence.

## Current UX Decisions

- The app does not block generation with clarification questions.
- Gemini/RAG can generate a package using explicit assumptions.
- The UI shows at most 3 optional accuracy questions on the first bid. After the user answers boosts, the backend incorporates those answers and clears the question loop.
- RAG evidence is available in a collapsed `Evidence Board`, translated into plain-language pricing/scope/risk reasoning.
- Raw source IDs, workspace rail, readiness gates, and multi-stage labels are no longer part of the main experience.
- Feedback is a small `Useful` action, not a major workflow stage.
- Recent bids are stored in browser localStorage and shown in a quiet drawer, not as a separate page.
- Users can switch between `Basic`, `Recommended`, and `Premium` packages without regenerating; package focus, pricing paragraph, scope summary, and proposal framing update with the selection.
- The active UI does not show demo brief cards or fake placeholder values.
- Weak RAG matches are not presented as close similar projects.

## Architecture

```text
React Deal Desk UI
  -> frontend/src/hooks/useQuickBid.js
  -> frontend/src/api/client.js
  -> POST /api/workspace/quick-generate
  -> backend/services/bidWorkspaceService.js
  -> classifier + RAG retrieval + extractor + gap detector + scope + pricing + proposal + evaluator
  -> Gemini through backend/utils/geminiClient.js
```

Only `backend/utils/geminiClient.js` imports `@google/genai`.

## Primary API

```http
POST /api/workspace/quick-generate
```

Request:

```json
{
  "brief": "client brief",
  "preferences": {
    "region": "US/global USD",
    "urgency": "normal"
  },
  "answers": []
}
```

Response includes:

- `workspace_id`
- `classification`
- `confidence`
- `critical_questions`
- `assumptions`
- `similar_projects`
- `package.scope`
- `package.pricing`
- `package.proposal`
- `evaluation`
- `bid_strategy`
- `estimate_evidence`
- `assumption_strategy`
- `deal_snapshot`
- `recommended_package`
- `package_comparison`
- `package_options`
- `proposal_sections`
- `risk_playbook`
- `evidence_board`
- `package.pricing.pricing_sanity`

Compatibility routes still exist:

- `/api/classify`
- `/api/extract`
- `/api/gaps`
- `/api/refine`
- `/api/scope`
- `/api/pricing`
- `/api/proposal`
- `/api/workspace/start`
- `/api/workspace/refine`
- `/api/workspace/generate-package`
- `/api/workspace/improve-proposal`

## Backend Behavior

The quick-generate route runs the full bid pipeline in one orchestration:

1. Classify the brief.
2. Ensure the vector index is ready. If it is missing or stale, build it once with the live embedding model and reuse the same preparation promise.
3. Retrieve local RAG context.
4. Extract requirements.
5. Detect missing details and risks only for first-pass bids.
6. Cap questions to 3.
7. If precision boost answers were submitted, refine extraction, clear remaining questions, and retain only risk signals from RAG.
8. Generate scope.
9. Generate pricing and apply freelancer-realistic sanity guardrails.
10. Generate proposal and quick client message.
11. Evaluate package quality.
12. Build Deal Desk fields: deal snapshot, package comparison, package options, proposal sections, risk playbook, and evidence board.
13. Return a user-friendly confidence summary.

Terminal monitoring is enabled through safe logs. Logs include request IDs, stage names, timings, model names, RAG counts, similar project titles/categories, question counts, and pricing tier ranges. Logs do not include full briefs, prompts, raw Gemini responses, API keys, proposal drafts, or quick client messages.

Important diagnostic events now cover the whole flow: quick generation start/end, stage timings/errors, hybrid retrieval start/end, reranked RAG results, extraction/gap/scope summaries, deterministic RAG pricing anchors, feedback hints, guardrail clamping, proposal/evaluation summaries, question-loop clearing, and feedback recording. Set `BIDCOPILOT_LOG_LEVEL=silent` to hide logs or `BIDCOPILOT_LOG_LEVEL=debug` for noisy per-query/per-embedding details.

If the user later answers optional questions, the same quick route is called again with `answers`, and the backend refines the extraction before regenerating the package.

## Frontend Behavior

Primary files:

- `frontend/src/App.jsx`
- `frontend/src/hooks/useQuickBid.js`
- `frontend/src/components/deal/BriefInbox.jsx`
- `frontend/src/components/deal/DealRoom.jsx`
- `frontend/src/utils/recentBids.js`

Legacy Studio and quick-bid components remain in the repository for compatibility tests, but the active app entry point is the Deal Desk.

The UI is a focused AI Deal Desk layout:

- Dark briefing header and warm editorial background
- Split intake screen with one brief box and compact controls
- Rich package cards and a deal briefing strip
- White document-style proposal canvas
- Amber/cyan accents
- Collapsed evidence, precision boost, and recent bid drawers
- Mobile-first stacked layout
- No exposed raw source IDs

Deal Room layout:

- Top: package selector and selected price
- Center: client-ready proposal, quick client message, scope snapshot, assumptions
- Drawers: Evidence Board, Precision Boosts, Recent bids

## RAG And Data

Knowledge lives in:

```text
backend/data/knowledge/
```

Vector index and metadata:

```text
backend/data/vectorIndex.json
backend/data/vectorIndex.meta.json
```

Feedback:

```text
backend/data/feedback/
```

The backend automatically prepares the live vector index during normal startup. It checks whether the saved index exists, whether it was built with the current embedding model, and whether the knowledge-base hash still matches. Missing or stale indexes are rebuilt once and reused.

The app uses fake deterministic embeddings only in tests and explicit index builds when `USE_FAKE_EMBEDDINGS=true`. Runtime API routes reject fake embedding mode. Live Gemini embeddings use `GEMINI_EMBEDDING_MODEL`.

RAG evidence is split into `Close similar projects`, `Related category references`, `Pricing rules`, and `Risks considered`. Retrieval uses focused typed queries, reranking, and coverage diagnostics. Close similar projects require strong category/subcategory-aligned retrieval. If no close case exists, the UI says so instead of showing irrelevant evidence.

RAG is not meant to know every possible project in the world. Its job is to ground generation with the closest available local cases and reusable pricing/scope/risk rules. When the exact project type is not present, the app uses category rules and says no close case was found instead of inventing similarity.

Pricing uses RAG as a deterministic anchor: retrieved pricing rules and close/related project cases define numeric package bands first. Gemini then provides wording, notes, and proposal framing around those bands, followed by final freelancer-realistic guardrails.

## Running

From the repo root:

```powershell
npm run dev
```

This starts backend and frontend together. Backend startup prepares the vector index automatically if needed.

Separate terminals are still supported:

```powershell
cd "d:\SEM 8\GEN-AI\Project\Freelance-Bid-CoPilot\backend"
npm run dev

cd "d:\SEM 8\GEN-AI\Project\Freelance-Bid-CoPilot\frontend"
npm run dev
```

Open:

```text
http://localhost:5173
```

## Verification

Acceptance commands:

```powershell
cd backend
npm test

cd ../frontend
npm test
npm run build
```

`npm run build:index` remains available for manual debugging or maintenance, but it is not required for normal app use.

Frontend tests may need to run outside the sandbox on Windows because Vite/Tailwind native dependencies can hit `spawn EPERM`.

## Limitations

- No auth system
- No external database
- No external vector DB
- No payment system
- No scraping
- No model training
- Feedback is bounded JSON-backed adaptation, not ML training
