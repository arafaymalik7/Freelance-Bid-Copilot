# Freelancer Bid Copilot 2.0

RAG-based freelance Deal Desk that turns vague client briefs into complete client-ready bid rooms with proposal writing, pricing strategy, scope planning, explainable estimate evidence, optional precision boosts, local recent bids, and JSON-backed feedback hints.

## Stack

- Backend: Node.js, Express, Jest, Supertest
- Frontend: React, Vite, Tailwind CSS 4, Vitest, Testing Library
- AI: Google Gemini via `@google/genai`
- Storage: local JSON files for knowledge, vector index, and feedback

## Setup

```bash
cd backend
npm install
copy .env.example .env
```

Add your key to `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
PORT=3001
GEMINI_MODEL=gemini-2.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

## Run Locally

From the repo root:

```bash
npm run dev
```

This starts both backend and frontend. The backend automatically checks `backend/data/vectorIndex.json` and its metadata on startup. If the index is missing or stale for the current knowledge base or embedding model, it builds the live Gemini index once and reuses it. You do not need to run an index command for normal use.

Backend logs are safe by default: they show request IDs, stage timings, model names, RAG match counts, and pricing ranges, but not full briefs, prompts, API keys, raw model responses, proposals, or quick client messages.

To run services separately:

```bash
cd backend
npm run dev

cd ../frontend
npm run dev
```

Open `http://localhost:5173`.

To silence backend monitoring logs:

```bash
BIDCOPILOT_LOG_LEVEL=silent npm run dev
```

Use `BIDCOPILOT_LOG_LEVEL=debug` only when you intentionally want per-embedding timing logs.

Useful diagnostic events include `quick_generate_start`, `stage_start`, `stage_end`, `hybrid_retrieval_start`, `hybrid_retrieval_end`, `rag_retrieval_result`, `extraction_result`, `gaps_result`, `scope_result`, `pricing_anchor_calculated`, `pricing_feedback_hints`, `pricing_anchor_applied`, `pricing_guardrails_result`, `proposal_result`, `evaluation_result`, `deal_intelligence`, `quick_generate_end`, and `feedback_recorded`.

## Optional Index Maintenance

Manual index builds are only for debugging or maintenance, not normal app startup.

Live Gemini index:

```bash
cd backend
npm run build:index
```

Deterministic fake index for tests/debugging:

```bash
cd backend
$env:USE_FAKE_EMBEDDINGS='true'; npm run build:index
```

Runtime API routes reject fake embedding mode; fake embeddings are only valid in tests and explicit index-build context.

## Main APIs

Compatibility pipeline routes are still available:

- `POST /api/classify`
- `POST /api/extract`
- `POST /api/gaps`
- `POST /api/refine`
- `POST /api/scope`
- `POST /api/pricing`
- `POST /api/proposal`

Primary 2.0 route:

- `POST /api/workspace/quick-generate`

Compatibility workspace routes:

- `POST /api/workspace/start`
- `POST /api/workspace/refine`
- `POST /api/workspace/generate-package`
- `POST /api/workspace/improve-proposal`
- `POST /api/feedback`
- `GET /api/knowledge/search?q=...&category=...&topK=...`

## Tests

Backend deterministic tests:

```bash
cd backend
npm test
```

Frontend tests and build:

```bash
cd frontend
npm test
npm run build
```

Optional live Gemini tests:

```bash
cd backend
npm run test:live
npm run test:live:workspace
```

## Documentation

- `CURRENT_APP_DOCUMENTATION.md`: current app architecture and feature details
- `UPGRADED_SCOPE.md`: RAG upgrade explanation, limitations, and viva/report wording
- `backend/tests/MANUAL_TESTS.md`: manual QA scenarios

## Current UX

The primary UI is the Deal Desk:

```text
Brief Inbox -> AI Deal Room -> Client-Ready Bid -> Improve / Copy / Save
```

The generated bid document is the center of the product. The default screen shows the proposal, selected package, price, quick client message, and scope first. RAG evidence, precision boosts, and recent bids are collapsed drawers so the interface stays focused. The app shows at most 3 optional questions and never blocks generation on missing details. After precision boosts are answered, the backend incorporates them and clears the question loop.

RAG evidence is intentionally strict. The backend now uses hybrid retrieval: focused typed queries for project cases, pricing rules, scope rules, risks, proposal patterns, and questions; lightweight reranking by category, subcategory, feature overlap, complexity, and vector score; and coverage diagnostics. Weak matches are hidden from `Close similar projects` and may appear only as `Related category references`, or the app says no close case was found instead of pretending irrelevant records are similar.

Pricing is anchored before Gemini wording. Retrieved cases/rules produce deterministic price bands first, Gemini writes package language around those bands, and final guardrails still clamp extreme estimates. Three packages remain available, but each has distinct scope, timeline, tradeoffs, and proposal framing.
