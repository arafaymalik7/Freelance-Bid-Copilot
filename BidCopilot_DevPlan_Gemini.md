# Freelancer Bid Copilot — Complete Development Plan (Gemini API Version)

---

## READ THIS FIRST — HOW TO USE THIS DOCUMENT

This is a **phased development plan** with exact prompts to give Codex at each stage.
Work through it **in order**. Do not skip phases. Each phase ends with a **checkpoint** —
only move forward once it passes. Skipping checkpoints is how projects break silently
and cost you 3 days of debugging in week 2.

**Why Gemini free API?**
- Completely free, no credit card needed
- 30 requests/minute, 1500 requests/day on free tier — more than enough
- Native JSON mode (`responseMimeType: "application/json"`) forces structured output
  at the API level, which makes the pipeline more reliable than prompt-only JSON enforcement
- Gemini 2.0 Flash Lite is fast and capable enough for all 7 pipeline steps

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                FRONTEND (React + Vite)               │
│  BriefInput → Pipeline Progress → Result Cards       │
│  Refinement Panel → Export / Copy Buttons            │
└────────────────────┬────────────────────────────────┘
                     │ HTTP (fetch)
┌────────────────────▼────────────────────────────────┐
│            BACKEND (Node.js + Express)               │
│  /api/classify → /api/extract → /api/gaps            │
│  /api/refine   → /api/scope   → /api/pricing         │
│  /api/proposal                                        │
└────────────────────┬────────────────────────────────┘
                     │ @google/generative-ai SDK
┌────────────────────▼────────────────────────────────┐
│              GEMINI API (Free Tier)                  │
│  Model: Gemini 3.1 Flash Lite                       │
│  JSON mode enforced at API level (responseMimeType)  │
└─────────────────────────────────────────────────────┘
```

**Folder structure:**
```
freelancer-bid-copilot/
├── backend/
│   ├── server.js
│   ├── routes/pipeline.js
│   ├── services/
│   │   ├── classifier.js
│   │   ├── extractor.js
│   │   ├── gapDetector.js
│   │   ├── refineService.js
│   │   ├── scopeBuilder.js
│   │   ├── pricingEngine.js
│   │   └── proposalGenerator.js
│   ├── utils/geminiClient.js          ← only file that's Gemini-specific
│   └── tests/
│       ├── classifier.test.js
│       ├── extractor.test.js
│       └── pipeline.integration.test.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── BriefInput.jsx
│   │   │   ├── StepProgress.jsx
│   │   │   ├── ClassificationCard.jsx
│   │   │   ├── ExtractionCard.jsx
│   │   │   ├── QuestionsCard.jsx
│   │   │   ├── RefinementPanel.jsx
│   │   │   ├── ScopeCard.jsx
│   │   │   ├── PricingCard.jsx
│   │   │   ├── ProposalCard.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   ├── hooks/usePipeline.js
│   │   ├── api/client.js
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── .env
├── .env.example
└── README.md
```

---

## How to Get Your Free Gemini API Key (Do This Before Starting)

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with a Google account
3. Click "Create API Key"
4. Copy the key — it looks like `AIzaSy...`
5. Keep it safe, you will add it to the `.env` file in Phase 0

Free tier limits: 30 requests/minute, 1500 requests/day, 1 million tokens/minute.
Your pipeline uses 7 API calls per full run. You will never hit these limits during development.

---

## PHASE 0 — Project Setup

### Prompt to give to Codex:

```
Create a new project called "freelancer-bid-copilot" with two separate apps:
a Node.js/Express backend and a React/Vite frontend.

BACKEND setup:
- Initialize with: npm init -y
- Install: express cors dotenv @google/generative-ai
- Install dev: nodemon jest
- Create server.js that:
  - Imports express, cors, dotenv
  - Calls dotenv.config() at the top
  - Sets up cors middleware (allow all origins for development)
  - Parses JSON request bodies
  - Has a GET /health endpoint returning { status: "ok", timestamp: new Date() }
  - Listens on port 3001
  - Logs "Server running on port 3001" on start
- Add to package.json scripts:
  "dev": "nodemon server.js"
  "start": "node server.js"
  "test": "jest --runInBand"
  (--runInBand runs tests serially, important because we hit a real API with rate limits)

FRONTEND setup:
- Create with: npm create vite@latest frontend -- --template react
- cd into frontend and install: tailwindcss postcss autoprefixer
- Initialize tailwind: npx tailwindcss init -p
- In tailwind.config.js set content to: ["./index.html", "./src/**/*.{js,jsx}"]
- In src/index.css replace everything with:
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
- Replace src/App.jsx with a simple component that shows an h1 "Freelancer Bid Copilot"
  centered on a full-screen dark navy (#0f172a) background with white text
- In vite.config.js add a server.proxy config:
  '/api': { target: 'http://localhost:3001', changeOrigin: true }
  This lets the frontend call /api/* without CORS issues

ENVIRONMENT:
- Create backend/.env with:
  GEMINI_API_KEY=your_key_here
  PORT=3001
  GEMINI_MODEL=gemini-3.1-flash-lite-preview
- Create backend/.env.example with the same keys but empty values
- Create a .gitignore at the project root containing:
  node_modules/
  .env
  dist/
  .DS_Store
```

### ✅ Checkpoint 0 — Verify before moving on:
1. `cd backend && node server.js` → no errors, logs "Server running on port 3001"
2. `curl http://localhost:3001/health` → returns `{"status":"ok",...}`
3. `cd frontend && npm run dev` → no errors
4. Browser at `http://localhost:5173` → dark page with heading visible

---

## PHASE 1 — Gemini Client Utility + Classifier Service

### Prompt to give Codex:

```
In the backend folder, create the Gemini API utility and the first pipeline service.

1. Create backend/utils/geminiClient.js:

   const { GoogleGenerativeAI } = require("@google/generative-ai");
   require("dotenv").config();

   const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

   /**
    * callGemini(systemPrompt, userMessage, jsonSchema)
    *
    * systemPrompt  - instruction for how the model should behave
    * userMessage   - the actual user request
    * jsonSchema    - optional JS object describing expected JSON shape (for documentation,
    *                 not enforced by SDK in this version)
    *
    * Returns: parsed JavaScript object (JSON.parse already applied)
    */
   async function callGemini(systemPrompt, userMessage) {
     const model = genAI.getGenerativeModel({
       model: process.env.GEMINI_MODEL || "gemini-2.0-flash-lite",
       systemInstruction: systemPrompt,
       generationConfig: {
         responseMimeType: "application/json",   // CRITICAL: forces JSON output at API level
         temperature: 0.3,                        // lower = more consistent, structured output
         maxOutputTokens: 2048,
       },
     });

     const result = await model.generateContent(userMessage);
     const rawText = result.response.text();

     try {
       return JSON.parse(rawText);
     } catch (parseError) {
       // Fallback: try to extract JSON from within the text
       const jsonMatch = rawText.match(/\{[\s\S]*\}/);
       if (jsonMatch) {
         try {
           return JSON.parse(jsonMatch[0]);
         } catch (_) {}
       }
       throw new Error(
         "Gemini returned non-JSON response. Raw: " + rawText.substring(0, 200)
       );
     }
   }

   module.exports = { callGemini };

   Important notes about this utility:
   - The responseMimeType: "application/json" is what makes Gemini output clean JSON
     without markdown fences or explanation text — this is Gemini's native JSON mode
   - temperature 0.3 keeps outputs consistent and structured (lower = less creative,
     more reliable for structured data)
   - The fallback JSON extraction handles edge cases where the model wraps output

2. Create backend/services/classifier.js:

   const { callGemini } = require("../utils/geminiClient");

   async function classifyProject(brief) {
     const systemPrompt = `You are a project classifier for freelance work.
   Your job is to analyze client briefs and identify what type of project is being requested.
   Always respond with a JSON object matching the exact schema provided.`;

     const userMessage = `Classify this client brief into a project category.

   Brief: "${brief}"

   Respond with this exact JSON structure:
   {
     "category": "<one of: web_development | mobile_app | ui_ux_design | content_writing | data_analytics | other>",
     "confidence": <number between 0.0 and 1.0>,
     "reasoning": "<one sentence explaining the classification>",
     "typical_stack": ["<technology 1>", "<technology 2>", "<technology 3>"],
     "pricing_unit": "<one of: per_project | per_hour | per_word | per_screen>"
   }`;

     return await callGemini(systemPrompt, userMessage);
   }

   module.exports = { classifyProject };

3. Create backend/routes/pipeline.js:
   - Import express Router
   - Import classifyProject from ../services/classifier
   - Create a POST /classify route:
     - Read brief from req.body.brief
     - If brief is missing or brief.trim().length < 10, return 400:
       { error: "Brief is required and must be at least 10 characters" }
     - Call classifyProject(brief.trim())
     - Return 200 with the result
     - Catch errors, return 500 with { error: err.message }
   - Export the router

4. In server.js, import the pipeline router:
   const pipelineRouter = require("./routes/pipeline");
   app.use("/api", pipelineRouter);

5. Create backend/tests/classifier.test.js with 3 tests:

   jest.setTimeout(30000); // Gemini API calls take a few seconds

   const { classifyProject } = require("../services/classifier");

   test("classifies a web development brief correctly", async () => {
     const result = await classifyProject(
       "I need a 5-page website for my bakery with an online menu and contact form"
     );
     expect(result.category).toBe("web_development");
     expect(result.confidence).toBeGreaterThan(0.6);
     expect(result.typical_stack).toBeInstanceOf(Array);
     expect(result.typical_stack.length).toBeGreaterThan(0);
   });

   test("classifies a mobile app brief correctly", async () => {
     const result = await classifyProject(
       "Build me an iOS and Android app for tracking daily water intake with reminders"
     );
     expect(result.category).toBe("mobile_app");
   });

   test("classifies a content writing brief correctly", async () => {
     const result = await classifyProject(
       "I need 10 blog posts about digital marketing, 800 words each, SEO optimized"
     );
     expect(result.category).toBe("content_writing");
   });
```

### ✅ Checkpoint 1 — Verify before moving on:
1. `cd backend && npm test -- --testPathPattern=classifier` → all 3 tests pass
2. Manual test: `curl -X POST http://localhost:3001/api/classify -H "Content-Type: application/json" -d '{"brief":"I need a website for my restaurant"}'`
   → returns JSON with category field
3. Test bad input: same request but no brief field → should return 400

---

## PHASE 2 — Extractor and Gap Detector Services

### Prompt to give Codex:

```
Add the requirement extractor and gap detector services to the backend.

1. Create backend/services/extractor.js:

   const { callGemini } = require("../utils/geminiClient");

   // Category-specific hints improve accuracy by telling Gemini what to look for
   const CATEGORY_HINTS = {
     web_development: "Pay attention to: number of pages, CMS needs, ecommerce features, hosting, mobile responsiveness",
     mobile_app: "Pay attention to: iOS/Android/both, user login, backend API, push notifications, offline use",
     ui_ux_design: "Pay attention to: number of screens, design system, deliverable format (Figma/XD), user research",
     content_writing: "Pay attention to: word count per piece, tone/voice, subject expertise, SEO, research needed",
     data_analytics: "Pay attention to: data sources, visualization type, reporting frequency, tool (Excel/Python/BI)",
     other: "Pay attention to: main deliverable, timeline, technical requirements"
   };

   async function extractRequirements(brief, category) {
     const hint = CATEGORY_HINTS[category] || CATEGORY_HINTS.other;

     const systemPrompt = `You are a requirements analyst for freelance projects.
   You extract structured information from vague or incomplete client briefs.
   Always respond with a JSON object matching the exact schema provided.`;

     const userMessage = `Extract requirements from this ${category} project brief.
   ${hint}

   Brief: "${brief}"

   Respond with this exact JSON:
   {
     "main_deliverable": "<core thing being built, one sentence>",
     "features": ["<feature 1>", "<feature 2>", "<feature 3>"],
     "deadline_hint": "<what client said about timeline, or null if not mentioned>",
     "budget_hint": "<any budget info, or null if not mentioned>",
     "technical_requirements": ["<tech req 1>", "<tech req 2>"],
     "assumptions": ["<assumption 1>", "<assumption 2>"],
     "client_experience_level": "<beginner | intermediate | expert>",
     "project_size": "<small | medium | large>"
   }

   Include at least 3 features. List assumptions for anything not explicitly stated.`;

     return await callGemini(systemPrompt, userMessage);
   }

   module.exports = { extractRequirements };

2. Create backend/services/gapDetector.js:

   const { callGemini } = require("../utils/geminiClient");

   async function detectGaps(brief, category, extraction) {
     const systemPrompt = `You are a senior freelance project consultant.
   You identify missing information in client briefs and generate smart follow-up questions.
   Always respond with a JSON object matching the exact schema provided.`;

     const userMessage = `Given this client brief and extracted requirements, identify gaps
   and generate follow-up questions a freelancer should ask before giving a quote.

   Project category: ${category}
   Original brief: "${brief}"
   Extracted requirements: ${JSON.stringify(extraction, null, 2)}

   Respond with this exact JSON:
   {
     "missing_info": ["<missing detail 1>", "<missing detail 2>"],
     "risk_flags": ["<risk 1>", "<risk 2>"],
     "follow_up_questions": [
       {
         "question": "<specific question to ask>",
         "why_important": "<one sentence: why this affects the price or scope>",
         "answer_type": "<text | yes_no | number | choice>",
         "choices": ["<option 1>", "<option 2>"] // only include if answer_type is choice, else null
       }
     ]
   }

   Generate 4 to 6 follow-up questions. Make them specific to ${category} projects.
   Do NOT ask generic questions like "what is your budget?" — ask targeted questions.`;

     return await callGemini(systemPrompt, userMessage);
   }

   module.exports = { detectGaps };

3. Add two routes to backend/routes/pipeline.js:

   POST /api/extract:
   - Required body fields: brief, category
   - Validate both present and non-empty
   - Call extractRequirements(brief, category)
   - Return 200 with result, 400 for missing fields, 500 for errors

   POST /api/gaps:
   - Required body fields: brief, category, extraction
   - Validate all three present
   - Call detectGaps(brief, category, extraction)
   - Return 200 with result, 400 for missing fields, 500 for errors

4. Add to backend/tests/extractor.test.js (4 tests, jest.setTimeout(30000)):

   test("extracts main_deliverable from a web brief", ...)
     brief = "I need an e-commerce store for handmade jewelry, 50 products, PayPal checkout"
     expect result.main_deliverable to be a non-empty string

   test("extracts at least 3 features", ...)
     same brief as above
     expect result.features to be an Array with length >= 3

   test("deadline_hint is null when not mentioned", ...)
     brief = "I need a simple logo design for my startup"
     category = "ui_ux_design"
     expect result.deadline_hint to be null

   test("gap detector generates 4 to 6 follow-up questions", ...)
     use a short vague brief and a real extraction object from the first test
     expect result.follow_up_questions.length to be between 4 and 6
     expect result.follow_up_questions[0].question to be a non-empty string
```

### ✅ Checkpoint 2 — Verify before moving on:
1. `npm test -- --testPathPattern=extractor` → all 4 tests pass
2. Test `/api/extract` manually with a real brief → returns structured JSON with features array
3. Test `/api/gaps` with brief + extraction → follow-up questions are specific and useful (not generic)

---

## PHASE 3 — Refinement, Scope, Pricing, and Proposal Services

### Prompt to give Codex:

```
Add the four remaining pipeline services to the backend.

1. Create backend/services/refineService.js:

   const { callGemini } = require("../utils/geminiClient");

   async function refineWithAnswers(brief, category, previousExtraction, userAnswers) {
     // userAnswers = [{ question: string, answer: string }, ...]

     const systemPrompt = `You are a requirements analyst updating a project brief.
   You have new information from the client. Update the extraction to reflect what was learned.
   Always respond with a JSON object matching the exact schema provided.`;

     const userMessage = `Update this project's requirements using the new information provided.

   Category: ${category}
   Original brief: "${brief}"
   Previous extraction: ${JSON.stringify(previousExtraction, null, 2)}

   New information (Q&A with client):
   ${userAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}

   Respond with this exact JSON (same structure as before, updated with new info):
   {
     "main_deliverable": "<updated if clarified>",
     "features": ["<updated complete features list>"],
     "deadline_hint": "<now more specific if answered, otherwise keep previous>",
     "budget_hint": "<now more specific if answered, otherwise keep previous>",
     "technical_requirements": ["<updated list>"],
     "assumptions": ["<only assumptions still unresolved>"],
     "client_experience_level": "<beginner | intermediate | expert>",
     "project_size": "<small | medium | large>",
     "refinement_round": ${(previousExtraction.refinement_round || 0) + 1},
     "new_follow_up_questions": [
       {
         "question": "<any remaining important question>",
         "why_important": "<one sentence>",
         "answer_type": "<text | yes_no | number | choice>",
         "choices": null
       }
     ]
   }

   If all important questions are answered, new_follow_up_questions can be an empty array.`;

     return await callGemini(systemPrompt, userMessage);
   }

   module.exports = { refineWithAnswers };

2. Create backend/services/scopeBuilder.js:

   const { callGemini } = require("../utils/geminiClient");

   async function buildScope(brief, category, extraction) {
     const systemPrompt = `You are a project manager creating a scope document.
   Be specific and realistic. Never pad the scope.
   Always respond with a JSON object matching the exact schema provided.`;

     const userMessage = `Create a project scope for this freelance project.

   Category: ${category}
   Brief: "${brief}"
   Requirements: ${JSON.stringify(extraction, null, 2)}

   Respond with this exact JSON:
   {
     "project_summary": "<2-3 sentence professional summary of what is being built>",
     "in_scope": ["<specific deliverable 1>", "<specific deliverable 2>"],
     "out_of_scope": ["<common addition that is NOT included 1>", "<common addition 2>"],
     "milestones": [
       {
         "name": "<milestone name>",
         "deliverable": "<what will be delivered>",
         "estimated_days": <number>
       }
     ],
     "total_estimated_days": <number>,
     "recommended_revision_rounds": <number>,
     "payment_structure": "<e.g. 50% upfront, 50% on delivery>"
   }

   Include at least 4 in_scope items, at least 3 out_of_scope items, and 3-5 milestones.`;

     return await callGemini(systemPrompt, userMessage);
   }

   module.exports = { buildScope };

3. Create backend/services/pricingEngine.js:

   const { callGemini } = require("../utils/geminiClient");

   async function suggestPricing(brief, category, extraction, scope) {
     const systemPrompt = `You are a freelance pricing consultant.
   Suggest realistic market-rate pricing for freelance projects.
   Base prices on project complexity and scope, not arbitrary numbers.
   Always respond with a JSON object matching the exact schema provided.`;

     const userMessage = `Suggest pricing bands for this freelance project.
   Use realistic USD market rates for a competent freelancer.

   Category: ${category}
   Project size: ${extraction.project_size}
   Total estimated days: ${scope.total_estimated_days}
   Scope summary: ${scope.project_summary}
   Key deliverables: ${scope.in_scope.join(", ")}

   Respond with this exact JSON:
   {
     "currency": "USD",
     "basic": {
       "min": <number>,
       "max": <number>,
       "includes": "<what is included at this level>",
       "timeline": "<e.g. 3-4 weeks>"
     },
     "recommended": {
       "min": <number>,
       "max": <number>,
       "includes": "<what is included at this level>",
       "timeline": "<e.g. 4-6 weeks>"
     },
     "premium": {
       "min": <number>,
       "max": <number>,
       "includes": "<what is included at this level — adds extra features or faster delivery>",
       "timeline": "<e.g. 2-3 weeks rush>"
     },
     "hourly_equivalent": <number>,
     "pricing_notes": [
       "<note 1 about scope creep or negotiation>",
       "<note 2 about what could increase the price>",
       "<note 3 about payment protection>"
     ]
   }

   Basic.max must be less than recommended.min. Recommended.max must be less than premium.min.`;

     return await callGemini(systemPrompt, userMessage);
   }

   module.exports = { suggestPricing };

4. Create backend/services/proposalGenerator.js:

   const { callGemini } = require("../utils/geminiClient");

   async function generateProposal(brief, category, extraction, scope, pricing) {
     const systemPrompt = `You are a professional proposal writer for freelancers.
   Write clear, confident, professional proposals. No fluff. No filler sentences.
   Always respond with a JSON object matching the exact schema provided.`;

     const userMessage = `Write a professional freelance proposal and a short client reply.

   Category: ${category}
   Original brief: "${brief}"
   Deliverable: ${extraction.main_deliverable}
   Features: ${extraction.features.join(", ")}
   Timeline: ${scope.total_estimated_days} days total
   Recommended price range: $${pricing.recommended.min} - $${pricing.recommended.max}
   Payment structure: ${scope.payment_structure}

   Respond with this exact JSON:
   {
     "subject_line": "<email subject line for the proposal>",
     "proposal_draft": "<full professional proposal text, plain text, no markdown symbols>",
     "client_reply": "<short 3-5 sentence message to send immediately, acknowledging the request and asking 1 key clarifying question or proposing a brief call>"
   }

   The proposal_draft should include: greeting, understanding of their need, your approach,
   what is included, timeline, pricing, payment terms, and a call to action.
   Keep it professional but warm. Aim for 200-300 words in the proposal.`;

     return await callGemini(systemPrompt, userMessage);
   }

   module.exports = { generateProposal };

5. Add four more routes to backend/routes/pipeline.js:

   POST /api/refine
   - Required: brief, category, previousExtraction, userAnswers
   - userAnswers must be an array
   - Calls refineWithAnswers, returns result

   POST /api/scope
   - Required: brief, category, extraction
   - Calls buildScope, returns result

   POST /api/pricing
   - Required: brief, category, extraction, scope
   - Calls suggestPricing, returns result

   POST /api/proposal
   - Required: brief, category, extraction, scope, pricing
   - Calls generateProposal, returns result

   All routes: validate required fields → 400 if missing, 500 on error

6. Create backend/tests/pipeline.integration.test.js:

   jest.setTimeout(180000); // Full pipeline can take 30-60 seconds

   test("full pipeline runs end to end", async () => {
     const brief = "I need an e-commerce website for my clothing store with product listings,
       shopping cart, Stripe payment, and an admin panel to manage orders. About 6 weeks.";

     // Step 1
     const { classifyProject } = require("../services/classifier");
     const classification = await classifyProject(brief);
     expect(classification.category).toBe("web_development");

     // Step 2
     const { extractRequirements } = require("../services/extractor");
     const extraction = await extractRequirements(brief, classification.category);
     expect(extraction.features.length).toBeGreaterThanOrEqual(3);
     expect(extraction.project_size).toBeDefined();

     // Step 3
     const { detectGaps } = require("../services/gapDetector");
     const gaps = await detectGaps(brief, classification.category, extraction);
     expect(gaps.follow_up_questions.length).toBeGreaterThanOrEqual(3);

     // Step 4
     const { buildScope } = require("../services/scopeBuilder");
     const scope = await buildScope(brief, classification.category, extraction);
     expect(scope.in_scope.length).toBeGreaterThanOrEqual(3);
     expect(scope.total_estimated_days).toBeGreaterThan(0);
     expect(scope.milestones.length).toBeGreaterThanOrEqual(3);

     // Step 5
     const { suggestPricing } = require("../services/pricingEngine");
     const pricing = await suggestPricing(brief, classification.category, extraction, scope);
     expect(pricing.recommended.min).toBeGreaterThan(0);
     expect(pricing.basic.max).toBeLessThan(pricing.premium.min);

     // Step 6
     const { generateProposal } = require("../services/proposalGenerator");
     const proposal = await generateProposal(brief, classification.category, extraction, scope, pricing);
     expect(proposal.proposal_draft.length).toBeGreaterThan(100);
     expect(proposal.client_reply.length).toBeGreaterThan(30);
   });
```

### ✅ Checkpoint 3 — Verify before moving on:
1. `npm test -- --testPathPattern=integration` → integration test passes end to end
2. All 7 routes respond correctly when tested manually
3. Check: pricing.basic.max < pricing.recommended.min < pricing.premium.min (order is correct)
4. The proposal text reads like a real proposal, not generic filler

---

## PHASE 4 — Frontend Foundation and API Client

### Prompt to give Codex:

```
Build the frontend foundation. Use a clean, dark professional theme throughout.

ADD CUSTOM COLORS to tailwind.config.js under theme.extend.colors:
  navy: {
    950: '#020617', 900: '#0f172a', 800: '#1e293b',
    700: '#334155', 600: '#475569', 500: '#64748b'
  }
  accent: {
    600: '#4f46e5', 500: '#6366f1', 400: '#818cf8', 300: '#a5b4fc'
  }

Design rules for all components:
- Page background: bg-navy-900
- Card background: bg-navy-800, rounded-xl, border border-navy-700
- Body text: text-slate-300
- Headings: text-white
- Primary button: bg-accent-500 hover:bg-accent-400 text-white font-medium rounded-lg px-5 py-2.5 transition-colors
- Secondary button: border border-navy-600 text-slate-300 hover:bg-navy-700 rounded-lg px-5 py-2.5 transition-colors
- All cards have: p-6 shadow-xl

1. Create frontend/src/api/client.js:
   Export 7 async functions. Each does a POST to its corresponding /api/* route.
   Each sends Content-Type: application/json and the appropriate body.
   Each calls response.json() and returns the data.
   If response.ok is false, throw new Error(data.error || "Request failed").

   Functions:
   - classifyBrief(brief)
     → POST /api/classify, body: { brief }
   - extractRequirements(brief, category)
     → POST /api/extract, body: { brief, category }
   - detectGaps(brief, category, extraction)
     → POST /api/gaps, body: { brief, category, extraction }
   - refineWithAnswers(brief, category, previousExtraction, userAnswers)
     → POST /api/refine, body: { brief, category, previousExtraction, userAnswers }
   - buildScope(brief, category, extraction)
     → POST /api/scope, body: { brief, category, extraction }
   - suggestPricing(brief, category, extraction, scope)
     → POST /api/pricing, body: { brief, category, extraction, scope }
   - generateProposal(brief, category, extraction, scope, pricing)
     → POST /api/proposal, body: { brief, category, extraction, scope, pricing }

2. Create frontend/src/hooks/usePipeline.js:
   This hook manages all state for the pipeline.

   State variables (all useState):
   - brief: string, initial ""
   - step: number, initial 0
   - loading: boolean, initial false
   - loadingMessage: string, initial ""
   - error: string or null, initial null
   - classification: object or null
   - extraction: object or null
   - gaps: object or null
   - scope: object or null
   - pricing: object or null
   - proposal: object or null
   - refinementRound: number, initial 0

   Functions to export:

   setBrief(text) — just sets the brief state

   runFullPipeline() — async:
     1. Set loading true, loadingMessage "Identifying project type...", clear error
     2. Call classifyBrief(brief) → set classification
     3. Set loadingMessage "Extracting requirements..."
     4. Call extractRequirements(brief, classification.category) → set extraction
     5. Set loadingMessage "Finding gaps and generating questions..."
     6. Call detectGaps(brief, classification.category, extraction) → set gaps
     7. Set loading false, advance step to 2 (questions step)
     On any error: set error to err.message, loading false, do not advance step

   submitRefinement(userAnswers) — async:
     1. Set loading true, loadingMessage "Refining with your answers..."
     2. Call refineWithAnswers(brief, classification.category, extraction, userAnswers)
        → set extraction to result, set gaps.follow_up_questions to result.new_follow_up_questions
     3. Increment refinementRound
     4. Set loading false
     On error: set error, loading false

   continueToProposal() — async:
     1. Set loading true, loadingMessage "Building project scope..."
     2. Call buildScope → set scope, loadingMessage "Calculating pricing..."
     3. Call suggestPricing → set pricing, loadingMessage "Writing your proposal..."
     4. Call generateProposal → set proposal
     5. Set loading false, step to 7
     On error: set error, loading false

   resetPipeline() — resets ALL state to initial values

   Return all state variables and all functions.

3. Create frontend/src/components/LoadingSpinner.jsx:
   Props: message (string)
   Full-screen centered overlay with:
   - A spinning ring using border-t-accent-500 border-4 w-16 h-16 rounded-full animate-spin
   - The message text below in text-slate-400 text-sm mt-4
   - Subtle pulsing background overlay bg-navy-900/80

4. Create frontend/src/components/StepProgress.jsx:
   Props: currentStep (0-7)
   Steps array: ["Brief", "Classify", "Extract", "Questions", "Refine", "Scope", "Pricing", "Proposal"]
   Show a horizontal bar with 8 dot indicators.
   - Completed (< currentStep): filled accent-500 dot with a ✓ inside, size w-8 h-8
   - Current (= currentStep): larger pulsing ring, accent-500, w-10 h-10
   - Future (> currentStep): navy-700 dot, w-8 h-8
   - Connect dots with a thin horizontal line, accent-colored for completed portions
   - Below each dot: small label text (hidden on small screens except current)

5. Create frontend/src/App.jsx:
   Import and use usePipeline.
   Render:
   - Fixed header: "🚀 Bid Copilot" on left, step counter "Step X of 7" on right,
     bg-navy-900 border-b border-navy-700, h-16
   - Below header: StepProgress (only show when step > 0)
   - Main content: full remaining screen height, overflow-y-auto, p-6
   - If loading: show LoadingSpinner with loadingMessage
   - If error: show a red error banner at top with message + "Try Again" + "Start Over" buttons
   - Content rendering based on step (placeholder divs for now, filled in Phase 5):
     step 0: <BriefInput> placeholder
     step 2: <QuestionsView> placeholder (shows classification + extraction + questions)
     step 7: <ResultsView> placeholder (shows scope + pricing + proposal)
   - Footer: small text "Built with Gemini AI" centered, text-navy-600
```

### ✅ Checkpoint 4 — Verify before moving on:
1. `npm run dev` in frontend → no errors
2. Dark page visible with header and footer
3. usePipeline.js imports without errors (check browser console)
4. api/client.js exports all 7 functions (can verify with a quick console.log test)

---

## PHASE 5 — Pipeline UI Components

### Prompt to give Codex:

```
Build all pipeline UI components. Follow the design rules from Phase 4.
Every card uses bg-navy-800 rounded-xl p-6 border border-navy-700 shadow-xl.

1. frontend/src/components/BriefInput.jsx
   Props: onSubmit(brief), loading
   Layout: centered card, max-w-2xl, mx-auto, mt-12

   Content:
   - Heading: "Paste Your Client Brief" (text-white text-2xl font-bold)
   - Subtext: "Paste any message, email or project description from a client"
     (text-slate-400 mt-1 mb-6)
   - Textarea: min h-48, w-full, bg-navy-700 border border-navy-600
     focus:border-accent-500 focus:outline-none rounded-lg p-4 text-white resize-none
     placeholder: "e.g. Hi, I need a website for my restaurant. Can you share your
     price and timeline? I want it to look modern with an online menu..."
   - Below textarea: left side shows char count colored by length:
     red if < 30, yellow if 30-100, green if > 100
   - Below textarea: right side shows word count (split by spaces)
   - "Analyze Brief" button: full width, mt-4, disabled + opacity-50 if brief length < 20
   - Three example brief chips below the button:
     Chip 1: "🌐 Website" → fills textarea with a web brief sample
     Chip 2: "📱 Mobile App" → fills with mobile app sample
     Chip 3: "✍️ Content Writing" → fills with content writing sample
   - Sample briefs for chips (realistic, about 80 words each):
     Web: "Hi, I need a website for my clothing boutique. I want to sell products online,
     maybe 30-40 items. The design should be elegant and modern. I also want customers
     to be able to create accounts and track their orders. Can you tell me the price
     and how long it will take?"
     Mobile: "I want to build an app for tracking personal finances. Users should be able
     to add income and expenses, see charts of their spending, and get alerts when they
     are close to their budget. iOS first, maybe Android later."
     Content: "I need help with blog content for my digital marketing agency. Looking for
     8 articles per month, around 1000 words each, on topics like SEO, social media, and
     email marketing. They need to be SEO optimized and sound professional."

2. frontend/src/components/ClassificationCard.jsx
   Props: classification
   A compact card showing:
   - A category badge (color-coded):
     web_development: blue | mobile_app: green | ui_ux_design: purple
     content_writing: yellow | data_analytics: orange | other: gray
   - Confidence: a thin progress bar (bg-accent-500) showing the percentage, with
     the percentage shown as text on the right
   - Reasoning: italic text in slate-300
   - Typical stack: row of small pill badges (bg-navy-700 text-accent-300 text-xs rounded px-2 py-1)

3. frontend/src/components/ExtractionCard.jsx
   Props: extraction
   Two-column grid on desktop, single column on mobile:
   Left column:
   - "What you're building": main_deliverable in text-white
   - "Features detected": each feature as a row with a green ✓ icon (text-emerald-400)
   - "Technical requirements": blue pills for each item
   Right column:
   - Deadline: show value or "Not specified" in text-slate-500 italic
   - Budget: same
   - Project size badge: small/medium/large with different colors
   - Client experience badge
   Bottom: collapsible "Assumptions" section using a toggle, showing assumptions as
   yellow ⚠ items when expanded

4. frontend/src/components/QuestionsCard.jsx
   Props: gaps, onSubmitAnswers(answers), onSkipToProposal, loading
   Local state: answers = {} (keyed by question index)

   Show:
   - If missing_info has items: section "Missing Information" with orange ⚠ icons
   - If risk_flags has items: section "Risk Flags" with red ⛔ icons
   - "Questions to Ask First" section with the follow-up questions

   For each question, render:
   - The question text in text-white font-medium
   - why_important in text-slate-400 text-sm italic below the question
   - Input based on answer_type:
     text → <input type="text" className="w-full bg-navy-700 border border-navy-600
             rounded-lg px-3 py-2 text-white mt-2 focus:border-accent-500 focus:outline-none">
     yes_no → two buttons: "Yes" and "No", selected one gets bg-accent-500 others bg-navy-700
     number → <input type="number" same styling>
     choice → radio group of buttons, one per choice, selected gets accent-500 style

   Track answers in local state as { [questionIndex]: answerValue }

   Bottom buttons:
   - "Submit Answers & Refine" (primary button): disabled if no answers filled,
     on click calls onSubmitAnswers with formatted array
   - "Skip to Proposal →" (secondary button, smaller): calls onSkipToProposal

5. frontend/src/components/RefinementPanel.jsx
   Props: refinementRound, newQuestions, extraction, onSubmitMore(answers), onContinue
   Show a green success banner: "✓ Round [N] complete — requirements updated"
   If newQuestions has items: show QuestionsCard with the new questions + a
   "Continue to Proposal" button at the top in addition to the refinement options
   If newQuestions is empty: show "All questions answered! Ready to generate proposal."
   with only the "Continue to Proposal" button

6. frontend/src/components/ScopeCard.jsx
   Props: scope
   Show:
   - project_summary in a highlighted blockquote-style box (border-l-4 border-accent-500 pl-4)
   - Two columns: "In Scope" (green ✓ items) | "Out of Scope" (red ✕ items)
   - Milestones: horizontal scrollable timeline, each milestone is a card showing
     name, deliverable, estimated_days
   - Bottom info bar: total_estimated_days | recommended_revision_rounds | payment_structure

7. frontend/src/components/PricingCard.jsx
   Props: pricing
   Three side-by-side cards (on mobile: stacked):
   - Basic: bg-navy-700, label "Basic" in gray
   - Recommended: bg-accent-600/20 border-2 border-accent-500, label "Recommended ⭐"
                  slightly larger font on price, add "Most popular" badge at top
   - Premium: bg-navy-700, label "Premium / Rush"
   Each card shows: price range ($min - $max) in large bold text, includes text, timeline
   Below cards: pricing_notes as gray info callouts with a 💡 icon each

8. frontend/src/components/ProposalCard.jsx
   Props: proposal, onStartOver
   Two tabs: "📄 Proposal Draft" | "💬 Client Reply"
   Active tab has accent-500 border-bottom and white text, inactive is gray
   Each tab shows the text in a readonly textarea:
   - bg-navy-700 w-full rounded-lg p-4 text-slate-200 min-h-48 font-mono text-sm
   - users can select and copy manually
   "Copy to Clipboard" button per tab: on click, copies text, changes to "✓ Copied!" for 2s
   Subject line shown above the proposal tab: "Subject: [subject_line]" with its own copy button
   Summary bar above tabs:
   - Category | Size | [total_estimated_days] days | $[recommended.min]–$[recommended.max]
   At very bottom: "🔄 Start New Brief" button (calls onStartOver)

9. Update App.jsx to render the right component based on step:
   - step 0: <BriefInput onSubmit={text => { setBrief(text); runFullPipeline(); }} />
   - step 2 (loading = false): scrollable column with ClassificationCard + ExtractionCard
     + QuestionsCard; if refinementRound > 0, show RefinementPanel instead of QuestionsCard
   - step 7: scrollable column with ScopeCard + PricingCard + ProposalCard
   Pass loading, classification, extraction, gaps, scope, pricing, proposal, refinementRound
   from usePipeline to the relevant components.
   Wire up: onSubmitAnswers → submitRefinement, onSkipToProposal/onContinue → continueToProposal,
   onStartOver → resetPipeline
```

### ✅ Checkpoint 5 — Verify before moving on:
1. Paste a real brief and click Analyze → spinner → classification + questions appear
2. Fill in some answers, click Submit → refinement runs, round counter shows "Round 1"
3. Click Continue to Proposal → scope, pricing, proposal all appear correctly
4. Pricing tiers are in order (basic < recommended < premium)
5. Copy buttons work for proposal and client reply
6. "Start New Brief" resets everything back to the input screen
7. Works on mobile (test by narrowing browser to 375px)

---

## PHASE 6 — Error Handling and Polish

### Prompt to give Codex:

```
Add error handling, edge cases, and UI polish.

BACKEND:
1. In geminiClient.js, add retry logic:
   - Wrap the generateContent call in a try/catch
   - If it throws and the error message contains "429" or "quota" or "overloaded":
     wait 3 seconds (await new Promise(r => setTimeout(r, 3000))) then retry once
   - If retry also fails, throw the original error with message:
     "API rate limit hit. Please wait a moment and try again."

2. In each service file, add a validation wrapper after callGemini returns:
   - Check that the returned object has the expected top-level keys
   - For classifier: check category, confidence exist
   - For extractor: check main_deliverable, features (array) exist
   - For gapDetector: check follow_up_questions (array) exists
   - For scopeBuilder: check in_scope, milestones (arrays) exist
   - For pricingEngine: check basic.min, recommended.min, premium.min exist
   - For proposalGenerator: check proposal_draft, client_reply exist
   - If validation fails, throw new Error("Incomplete response from AI: missing [field]")

3. In server.js, add a global error handler as the LAST middleware:
   app.use((err, req, res, next) => {
     console.error("Unhandled error:", err.message);
     res.status(500).json({ error: "Something went wrong", detail: err.message });
   });

FRONTEND:
4. In usePipeline.js, the error state should store both a message and a retryFn:
   Change error state to: { message: string, retryFn: function } or null
   When catching errors, save the relevant retry function as retryFn
   Example: if classify fails, retryFn = runFullPipeline
   If continueToProposal fails, retryFn = continueToProposal

5. In App.jsx error banner, wire the "Try Again" button to error.retryFn()

6. In BriefInput, add brief length validation:
   - If submitted with < 20 chars: show inline red text "Please add more detail for
     accurate results — at least 2-3 sentences work best" below the textarea
   - Do not call onSubmit in this case

7. Add fade-in animation to cards as they appear:
   In index.css add:
   @keyframes fadeInUp {
     from { opacity: 0; transform: translateY(16px); }
     to   { opacity: 1; transform: translateY(0); }
   }
   .fade-in { animation: fadeInUp 0.35s ease both; }
   Add className="fade-in" to ClassificationCard, ExtractionCard, QuestionsCard,
   ScopeCard, PricingCard, ProposalCard

8. Add a sticky results navigation bar when step === 7:
   A fixed bar at the top (below the main header) with:
   - "Jump to: Scope | Pricing | Proposal" links (smooth scroll to section ids)
   - A "Start Over" button on the right
   Give each results card an id: "scope-section", "pricing-section", "proposal-section"

9. In PricingCard, add a hover tooltip to the "Recommended ⭐" label:
   "Best balance of features, quality, and price for most clients"
   Simple title attribute or a small text popover
```

### ✅ Checkpoint 6 — Verify before moving on:
1. Submit a 5-character brief → red validation message shown, API not called
2. Temporarily break the API key in .env → error banner shows with "Try Again" button
3. Fix the key and click "Try Again" → pipeline continues
4. Cards fade in smoothly as each step completes
5. Sticky nav appears on results page and smooth-scrolls correctly

---

## PHASE 7 — Final Tests and Documentation

### Prompt to give Codex:

```
Add final tests and complete the documentation.

1. Add 4 more tests to backend/tests/pipeline.integration.test.js:

   test("handles an extremely vague brief without crashing", async () => {
     const brief = "need app how much";
     const classification = await classifyProject(brief);
     expect(classification.category).toBeDefined();
     const extraction = await extractRequirements(brief, classification.category);
     expect(extraction.main_deliverable).toBeDefined();
     const gaps = await detectGaps(brief, classification.category, extraction);
     expect(gaps.follow_up_questions.length).toBeGreaterThanOrEqual(3);
   });

   test("refinement round increments correctly", async () => {
     const brief = "I need a mobile app for food delivery";
     const { classifyProject } = require("../services/classifier");
     const { extractRequirements } = require("../services/extractor");
     const { refineWithAnswers } = require("../services/refineService");
     const classification = await classifyProject(brief);
     const extraction = await extractRequirements(brief, classification.category);
     const answers = [{ question: "iOS or Android?", answer: "Both platforms" }];
     const refined = await refineWithAnswers(brief, classification.category, extraction, answers);
     expect(refined.refinement_round).toBe(1);
     expect(refined.features.length).toBeGreaterThanOrEqual(extraction.features.length - 1);
   });

   test("pricing tiers are always in correct order", async () => {
     const brief = "Build a project management tool like Trello for small teams";
     const classification = await classifyProject(brief);
     const extraction = await extractRequirements(brief, classification.category);
     const scope = await buildScope(brief, classification.category, extraction);
     const pricing = await suggestPricing(brief, classification.category, extraction, scope);
     expect(pricing.basic.max).toBeLessThan(pricing.recommended.min);
     expect(pricing.recommended.max).toBeLessThan(pricing.premium.min);
   });

   test("proposal draft is at least 150 words", async () => {
     const brief = "I need a portfolio website with 5 pages and a contact form";
     const classification = await classifyProject(brief);
     const extraction = await extractRequirements(brief, classification.category);
     const scope = await buildScope(brief, classification.category, extraction);
     const pricing = await suggestPricing(brief, classification.category, extraction, scope);
     const proposal = await generateProposal(brief, classification.category, extraction, scope, pricing);
     const wordCount = proposal.proposal_draft.split(" ").length;
     expect(wordCount).toBeGreaterThan(150);
     expect(proposal.client_reply.length).toBeGreaterThan(50);
   });

2. Create backend/tests/MANUAL_TESTS.md listing 10 manual test scenarios:
   1. Full pipeline with detailed web brief (restaurant website, 5 pages, menu, booking)
   2. Vague mobile app brief with no budget or timeline
   3. Content writing brief with tight deadline (2 weeks, 10 articles)
   4. UI/UX brief with conflicting requirements (modern AND traditional)
   5. Brief with very high budget mentioned ("budget is $50,000")
   6. Brief written informally with typos and casual language
   7. Run 2 full refinement rounds before continuing to proposal
   8. Skip refinement entirely and go straight to proposal
   9. Copy both proposal and client reply to clipboard
   10. Click Start Over and verify all state resets cleanly

3. Update README.md at project root:
   # Freelancer Bid Copilot
   AI-powered tool that converts vague client briefs into professional bid packages
   using a 7-step Gemini-powered pipeline.

   ## Prerequisites
   - Node.js 18 or higher
   - Free Gemini API key from https://aistudio.google.com/app/apikey

   ## Setup
   1. Clone this repository
   2. cd backend && npm install
   3. cp .env.example .env — then open .env and paste your Gemini API key
   4. cd ../frontend && npm install

   ## Running
   Terminal 1: cd backend && npm run dev
   Terminal 2: cd frontend && npm run dev
   Then open http://localhost:5173

   ## Running Tests
   cd backend && npm test

   ## Pipeline Overview
   Step 1 — Project Classifier: detects category (web/mobile/design/content)
   Step 2 — Requirement Extractor: pulls structured requirements from brief
   Step 3 — Gap Detector: finds missing info, generates follow-up questions
   Step 4 — Refinement Loop: user answers questions, outputs update (repeatable)
   Step 5 — Scope Builder: in/out scope, milestones, timeline
   Step 6 — Pricing Engine: basic/recommended/premium pricing bands
   Step 7 — Proposal Generator: professional proposal + short client reply

   ## Tech Stack
   Frontend: React 18 + Vite + Tailwind CSS
   Backend: Node.js + Express
   AI: Google Gemini gemini-3.1-flash-lite-preview 
4. Final cleanup:
   - Remove all console.log from services (keep console.error for real errors)
   - Verify .env and node_modules are in .gitignore
   - Make sure frontend builds successfully: cd frontend && npm run build (no errors)
   - Confirm both servers start cleanly from scratch (fresh terminal, no cached state)
```

### ✅ Final Checkpoint — Project is complete when:
1. `cd backend && npm test` → all tests pass (8+ total)
2. `cd frontend && npm run build` → no build errors
3. Full pipeline works end to end with a real brief
4. Refinement loop works for at least 2 rounds
5. Error states handled (bad input, API error)
6. UI works on mobile screen width (375px)
7. Both copy buttons work
8. Start Over resets cleanly

---

## Quick Reference — What Each File Does

| File | Purpose |
|------|---------|
| `backend/utils/geminiClient.js` | ALL Gemini API calls go through here. JSON mode enforced here. |
| `backend/services/classifier.js` | Step 1: detects project type |
| `backend/services/extractor.js` | Step 2: pulls structured requirements |
| `backend/services/gapDetector.js` | Step 3: finds gaps, generates questions |
| `backend/services/refineService.js` | Step 4: updates extraction with user answers |
| `backend/services/scopeBuilder.js` | Step 5: in/out scope, milestones |
| `backend/services/pricingEngine.js` | Step 6: 3-tier pricing bands |
| `backend/services/proposalGenerator.js` | Step 7: proposal + client reply |
| `backend/routes/pipeline.js` | All 7 API routes with validation |
| `frontend/src/hooks/usePipeline.js` | All state + pipeline orchestration |
| `frontend/src/api/client.js` | All fetch calls to backend |
| `frontend/src/App.jsx` | Main layout and step routing |
| `frontend/src/components/*.jsx` | One component per pipeline output |

---

## Gemini-Specific Notes for Development

**Why JSON mode works better here than Claude:**
The `responseMimeType: "application/json"` parameter in the Gemini SDK guarantees the
model outputs valid JSON. You do not need to beg in the prompt. The temperature: 0.3
setting keeps outputs consistent and deterministic, which matters for a pipeline where
each step feeds the next.

**If you get a 429 error during testing:**
The free tier allows 30 requests per minute. If you run all tests at once you may hit
this. The `--runInBand` Jest flag runs tests one at a time (not in parallel), which
mostly prevents this. If it still happens, add a 2-second delay between tests:
`beforeEach(async () => { await new Promise(r => setTimeout(r, 2000)); });`


**Prompts do not need to say "return ONLY JSON":**
Because of JSON mode, you can drop those phrases. Just describe the schema clearly.

---

## Critical Rules

1. Never skip a checkpoint. It feels slower but is much faster overall.
2. Test backend routes independently (curl/Postman) BEFORE building frontend.
3. If Gemini returns something unexpected, fix the prompt first — add a clearer
   schema example, not more "RETURN ONLY JSON" instructions (JSON mode handles that).
4. Git commit after every checkpoint. One commit per phase minimum.
5. Keep geminiClient.js as the ONLY file that imports @google/generative-ai.
   All services use callGemini(). This means if Gemini changes their SDK you fix one file.
