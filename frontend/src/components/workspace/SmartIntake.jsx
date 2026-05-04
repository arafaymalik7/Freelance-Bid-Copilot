import { useState } from "react";

const EXAMPLES = [
  "Build a Shopify-style ecommerce store for a boutique clothing brand with Stripe checkout, customer accounts, product variants, and admin order management.",
  "Design a mobile fitness app MVP with onboarding, workout plans, reminders, progress tracking, and a simple subscription-ready flow.",
  "Create a KPI dashboard from CSV and Google Sheets data with cleanup, charts, filters, and weekly exportable reports.",
];

export function SmartIntake({ loading, onSubmit }) {
  const [brief, setBrief] = useState("");
  const [region, setRegion] = useState("US/global USD");
  const [urgency, setUrgency] = useState("normal");

  const submit = (event) => {
    event.preventDefault();
    onSubmit(brief, { region, urgency });
  };

  return (
    <section className="grid min-h-[calc(100vh-8rem)] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="fade-in">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.35em] text-accent-300">
          Freelancer Bid Copilot 2.0
        </p>
        <h1 className="max-w-3xl font-heading text-5xl font-semibold leading-[0.95] text-white md:text-7xl">
          Turn messy briefs into grounded bid packages.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          The workspace classifies the project, retrieves similar local cases, asks clarifying questions,
          builds scope and pricing, evaluates proposal quality, and saves lightweight feedback hints.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {["Local RAG", "Vector Search", "Quality Review"].map((item) => (
            <div key={item} className="rounded-2xl border border-navy-700 bg-navy-900/70 p-4">
              <p className="font-heading text-sm font-semibold text-white">{item}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Built from local JSON knowledge, deterministic tests, and Gemini generation.
              </p>
            </div>
          ))}
        </div>
      </div>

      <form className="fade-in rounded-[2rem] border border-navy-700 bg-navy-900/85 p-5 shadow-2xl md:p-6" onSubmit={submit}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-white">Smart Intake</h2>
            <p className="mt-1 text-sm text-slate-400">Paste a client brief or start from an example.</p>
          </div>
          <span className="rounded-full bg-accent-500/15 px-3 py-1 text-xs font-medium text-accent-300">
            RAG-ready
          </span>
        </div>

        <textarea
          className="min-h-52 w-full resize-y rounded-2xl border border-navy-700 bg-navy-950/80 p-4 text-base leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-accent-400 focus:ring-4 focus:ring-accent-500/15"
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Example: I need an ecommerce website for my boutique brand with product pages, Stripe checkout, accounts, and order admin..."
          value={brief}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-300">
            Region preference
            <select
              className="mt-2 w-full rounded-xl border border-navy-700 bg-navy-950 p-3 text-white outline-none focus:border-accent-400"
              onChange={(event) => setRegion(event.target.value)}
              value={region}
            >
              <option>US/global USD</option>
              <option>South Asia budget-sensitive</option>
              <option>EU premium</option>
              <option>Remote startup</option>
            </select>
          </label>

          <label className="text-sm text-slate-300">
            Urgency
            <select
              className="mt-2 w-full rounded-xl border border-navy-700 bg-navy-950 p-3 text-white outline-none focus:border-accent-400"
              onChange={(event) => setUrgency(event.target.value)}
              value={urgency}
            >
              <option>normal</option>
              <option>rush</option>
              <option>flexible</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              className="rounded-full border border-navy-700 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-accent-400 hover:text-white"
              key={example}
              onClick={() => setBrief(example)}
              type="button"
            >
              {example.slice(0, 55)}...
            </button>
          ))}
        </div>

        <button
          className="mt-6 w-full rounded-2xl bg-accent-500 px-5 py-4 font-heading font-semibold text-navy-950 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Analyzing..." : "Start RAG Workspace"}
        </button>
      </form>
    </section>
  );
}
