# Freelancer Bid Copilot 2.0 RAG Upgrade Scope

## Upgrade Summary

The app has been upgraded from a linear Gemini proposal generator into a RAG-based Deal Desk.

The system retrieves local knowledge before generation, uses that context to improve scope/pricing/proposal quality, applies freelancer-realistic pricing guardrails, evaluates the final bid package, explains bid strategy and estimate evidence, asks at most 3 optional precision boosts, stores local recent bids in the browser, and stores lightweight feedback hints for future runs.

## What RAG Means Here

RAG means Retrieval-Augmented Generation.

In this project:

1. The user enters a freelance client brief.
2. The backend classifies the brief.
3. The backend embeds the brief.
4. The retrieval layer runs focused typed queries for project cases, pricing, scope, risks, proposal patterns, and questions.
5. Results are reranked with vector similarity, category/subcategory alignment, feature overlap, and complexity signals.
6. The most relevant local project cases and rules are compacted into a RAG context with coverage diagnostics.
7. Gemini uses that compact context while extracting requirements, asking first-pass questions, building scope, pricing language, and writing proposals.

The app does not scrape the web and does not use an external vector database.

## Local Knowledge Base

Knowledge files live under:

```text
backend/data/knowledge/
```

Files:

- `projectCases.json`
- `pricingRules.json`
- `scopeRules.json`
- `riskPatterns.json`
- `proposalPatterns.json`
- `questionTemplates.json`

Current size:

- 60+ total records
- categories include web development, mobile apps, UI/UX, content writing, data analytics, and general rules
- mobile knowledge includes social feed, chat, community, creator video, marketplace, finance, habit, and delivery cases

Each record has enough searchable text to support embeddings and retrieval.

## Embeddings

Production embedding path:

```text
Gemini gemini-embedding-001
```

Backend helper:

```text
backend/utils/geminiClient.js -> callGeminiEmbedding()
```

Test/index deterministic path:

```text
USE_FAKE_EMBEDDINGS=true
```

Fake embeddings are deterministic hash-based vectors. They are used for repeatable tests and explicit index generation without API calls. Runtime API routes reject fake embedding mode so user-facing runs do not use fake vectors.

For live app runs, the backend automatically prepares the Gemini vector index at startup if the index is missing or stale. The supported default embedding model is `gemini-embedding-001`.

## Vector Search

File:

```text
backend/services/vectorSearchService.js
```

Capabilities:

- Build vector index from all knowledge records
- Save index metadata with embedding model, embedding mode, record count, and knowledge-base hash
- Detect missing or stale indexes
- Auto-build the live index once during backend startup and reuse the same promise for concurrent requests
- Save index to `backend/data/vectorIndex.json`
- Load existing index
- Cosine similarity search
- Top-K retrieval
- Category filtering
- Subcategory filtering
- Type filtering

Manual index build command for maintenance/debugging:

```bash
cd backend
$env:USE_FAKE_EMBEDDINGS='true'; npm run build:index
```

## RAG Context

File:

```text
backend/services/ragContextBuilder.js
```

The context builder returns compact prompt-safe packs:

- `similar_cases`
- `related_cases`
- `pricing_rules`
- `scope_rules`
- `risk_patterns`
- `proposal_patterns`
- `question_templates`
- `source_ids`

The prompt receives summaries, not full raw records.

Close similar cases are strict: the record must align with the project category/subcategory and pass a reranked relevance threshold. Weaker category-aligned project cases are treated as related references, not as close matches. If no close project case exists, the UI says no close case was found.

The purpose of RAG is not to cover every possible freelance project. The local knowledge base acts as a curated bid memory: project cases are used when they are close enough, while pricing rules, scope rules, risk patterns, proposal patterns, and question templates are used across broader project types. This prevents the model from relying only on generic language while also avoiding fake “similar project” claims.

Pricing is now anchored deterministically from RAG before Gemini wording. Retrieved pricing rules and close/related project cases create stable Basic, Recommended, and Premium bands; Gemini supplies package wording and rationale, then final guardrails enforce freelancer-realistic caps.

## Primary API Flow

### Quick Generate

```http
POST /api/workspace/quick-generate
```

Runs the full bid pipeline in one user-facing call:

- classification
- RAG retrieval
- extraction
- gap detection with max 3 questions
- scope generation
- pricing generation
- pricing sanity guardrails
- proposal generation
- quality evaluation

The UI uses this as the primary flow so users get a complete package first and can improve it only if needed.

The quick-generate response also includes Deal Desk fields:

- `deal_snapshot`
- `recommended_package`
- `package_comparison`
- `proposal_sections`
- `risk_playbook`
- `evidence_board`
- `package_options`
- `pricing_sanity`

These fields make the RAG and AI output presentation-ready without exposing raw vector/source implementation details.

## Compatibility Workspace API Flow

### Start

```http
POST /api/workspace/start
```

Runs:

- classification
- RAG retrieval
- requirement extraction
- gap detection
- readiness score

### Refine

```http
POST /api/workspace/refine
```

Runs:

- refinement with user answers
- gap refresh
- readiness refresh
- backend-owned refinement round update

### Generate Package

```http
POST /api/workspace/generate-package
```

Runs:

- scope generation
- pricing generation
- proposal generation
- quality evaluation

### Improve Proposal

```http
POST /api/workspace/improve-proposal
```

Runs:

- proposal rewrite using evaluation feedback and RAG context
- returns changed proposal and `changes_made`

### Feedback

```http
POST /api/feedback
```

Stores:

- rating
- labels
- optional comment
- category/subcategory aggregate stats
- bounded price adjustment hints

### Knowledge Search

```http
GET /api/knowledge/search?q=ecommerce&category=web_development&topK=5
```

Uses the same vector search path as the workspace.

## Evaluator

The bid evaluator scores the generated package using weighted dimensions:

- Scope clarity: 20
- Pricing justification: 20
- Risk coverage: 15
- Missing info handling: 15
- Professional tone: 15
- RAG grounding: 15

The validator clamps scores to valid ranges and exposes:

- `overall_score`
- `computed_score`
- `verdict`
- `scores`
- `strengths`
- `concerns`
- `recommendations`

## Feedback Learning

Feedback is not model training.

It is local JSON-backed, bounded, rule-based adaptation.

Files:

```text
backend/data/feedback/feedbackLog.json
backend/data/feedback/feedbackStats.json
```

Price adjustment is capped:

```text
0.85 <= price_adjustment_factor <= 1.15
```

This prevents feedback from causing extreme pricing drift.

## Frontend Upgrade

Primary app flow changed from pages and workspace stages to a focused Deal Desk:

- `Brief Inbox`: paste the client brief and choose market/timeline preference.
- `AI Deal Room`: opens immediately after generation with a complete bid package.
- `Client-Ready Bid`: center document for proposal, scope, pricing, assumptions, and quick client message.
- `Evidence Board`: collapsed RAG explanation for close similar projects, related category references, pricing logic, scope logic, and risks.
- `Precision Boosts`: collapsed max 3 optional questions that can regenerate the package once; answered boosts do not create another question loop.
- `Recent Deals`: localStorage-backed drawer for reopening generated bids.

Package switching updates the displayed package focus, scope summary, pricing paragraph, tradeoffs, and selected price. Basic, Recommended, and Premium are no longer just three prices over one identical proposal.

The active UI avoids demo brief cards, fake placeholder copy, and always-open side panels.

## Runtime Monitoring

Backend terminal logs are safe by default. They include:

- request IDs
- stage start/end/error events
- durations
- Gemini generation and embedding model names
- RAG source counts and similar project titles/categories
- question counts
- pricing tier ranges

They do not include full briefs, prompts, raw responses, proposal drafts, client replies, or API keys.

Primary hook:

```text
frontend/src/hooks/useQuickBid.js
```

Primary active components:

- `frontend/src/components/deal/BriefInbox.jsx`
- `frontend/src/components/deal/DealRoom.jsx`

Legacy workspace/studio components remain available for compatibility tests, but they are no longer the primary UI.

## What Was Deliberately Not Added

- No external vector database
- No SQLite/Postgres/MongoDB
- No auth system
- No payment system
- No scraping
- No GANs
- No model training
- No autonomous internet research

## Viva / Report Wording

Use this wording:

```text
Freelancer Bid Copilot 2.0 uses a local Retrieval-Augmented Generation pipeline. Project cases and rules are stored as JSON, embedded, indexed locally, and retrieved with cosine similarity. Retrieved records are compacted into prompt context so Gemini can generate more grounded requirements, questions, scope, pricing, and proposals. The feedback system does not train the model; it stores bounded rule-based hints in JSON for future pricing and proposal adjustments.
```

Avoid saying:

```text
The model learns from feedback.
```

Use:

```text
The application stores feedback-derived hints that influence future generation within bounded rules.
```
