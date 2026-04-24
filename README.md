# Freelancer Bid Copilot

AI-powered tool that turns vague client briefs into structured freelance bid packages with a Gemini-driven 7-step pipeline.

## Prerequisites

- Node.js 20 or higher
- A Gemini API key from https://aistudio.google.com/app/apikey

## Setup

1. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Copy `backend/.env.example` to `backend/.env`, then add your API key:

   `GEMINI_API_KEY=your_key_here`

3. Install frontend dependencies:

   ```bash
   cd ../frontend
   npm install
   ```

## Running

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Testing

Backend deterministic tests:

```bash
cd backend
npm test
```

Backend live Gemini smoke tests:

```bash
cd backend
npm run test:live
```

Frontend tests:

```bash
cd frontend
npm test
```

## Pipeline Overview

1. Project classifier
2. Requirement extractor
3. Gap detector
4. Refinement loop
5. Scope builder
6. Pricing engine
7. Proposal generator

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- AI: Google Gemini via `@google/genai`
