import { useState } from "react";

const EXAMPLES = [
  "I need an ecommerce website for my boutique clothing brand with product pages, Stripe checkout, customer accounts, product variants, and simple admin order management. I want to launch in about 6 weeks.",
  "We need a mobile app MVP for a fitness coach with onboarding, workout plans, reminders, progress tracking, and subscription-ready screens.",
  "Create a KPI dashboard from CSV and Google Sheets data with cleanup, charts, filters, and weekly exportable reports for management.",
];

export function QuickBidIntake({ loading, onGenerate }) {
  const [brief, setBrief] = useState("");
  const [region, setRegion] = useState("US/global USD");
  const [urgency, setUrgency] = useState("normal");

  const submit = (event) => {
    event.preventDefault();
    onGenerate(brief, { region, urgency });
  };

  return (
    <section className="grid min-h-[calc(100vh-7rem)] items-center gap-10 lg:grid-cols-[1fr_30rem]">
      <div className="fade-in">
        <p className="font-mono text-sm uppercase tracking-[0.28em] text-amber-600">Bid Copilot</p>
        <h1 className="mt-5 max-w-4xl font-heading text-5xl font-semibold leading-[0.98] text-slate-950 md:text-7xl">
          Generate a freelance bid in one click.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Paste the client message. Get a practical price range, timeline, scope, proposal, and client reply immediately.
          If details are missing, the app uses clear assumptions and asks only the few questions that matter.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Draft first", "No blocking wizard or endless form."],
            ["Ask less", "Maximum 3 optional accuracy questions."],
            ["Show proof", "Similar projects stay in an optional evidence panel."],
          ].map(([title, body]) => (
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" key={title}>
              <p className="font-heading font-semibold text-slate-950">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </div>

      <form className="fade-in rounded-[2rem] bg-white p-5 shadow-2xl shadow-slate-200 ring-1 ring-slate-200 md:p-6" onSubmit={submit}>
        <div className="mb-5">
          <h2 className="font-heading text-2xl font-semibold text-slate-950">Client Brief</h2>
          <p className="mt-1 text-sm text-slate-500">Paste anything. Messy is fine.</p>
        </div>

        <textarea
          className="min-h-64 w-full resize-y rounded-3xl border border-slate-200 bg-slate-50 p-4 text-base leading-7 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-200/60"
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Example: Need a website for my clothing brand with checkout, accounts, order admin, and premium feel..."
          value={brief}
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Market
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 outline-none focus:border-amber-400"
              onChange={(event) => setRegion(event.target.value)}
              value={region}
            >
              <option>US/global USD</option>
              <option>South Asia budget-sensitive</option>
              <option>EU premium</option>
              <option>Remote startup</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Timeline pressure
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 outline-none focus:border-amber-400"
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
              className="rounded-full bg-slate-100 px-3 py-2 text-left text-xs text-slate-600 transition hover:bg-amber-100 hover:text-slate-950"
              key={example}
              onClick={() => setBrief(example)}
              type="button"
            >
              {example.slice(0, 52)}...
            </button>
          ))}
        </div>

        <button
          className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-4 font-heading font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Generating bid..." : "Generate Bid"}
        </button>
      </form>
    </section>
  );
}
