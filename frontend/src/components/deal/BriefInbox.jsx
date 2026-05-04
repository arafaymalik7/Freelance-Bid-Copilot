import { useState } from "react";

export function BriefInbox({ loading, onGenerate, recentBids = [], onShowRecent }) {
  const [brief, setBrief] = useState("");
  const [region, setRegion] = useState("US/global USD");
  const [urgency, setUrgency] = useState("normal");

  const submit = (event) => {
    event.preventDefault();
    onGenerate(brief, { region, urgency });
  };

  return (
    <main className="deal-ambient min-h-screen bg-[#f3eadb] text-[#17130d]">
      <div className="ambient-noise pointer-events-none fixed inset-0 z-0" />

      <section className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-6">
        <nav className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.35em] text-amber-800">Bid Copilot</p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight md:text-3xl">AI Deal Desk</h1>
          </div>
          {recentBids.length ? (
            <button
              className="rounded-full border border-[#d8c8ae] bg-white/70 px-4 py-2 text-sm font-bold text-[#17130d] shadow-sm backdrop-blur transition hover:bg-[#17130d] hover:text-white"
              onClick={onShowRecent}
              type="button"
            >
              Recent bids
            </button>
          ) : null}
        </nav>

        <div className="grid flex-1 items-center gap-5 py-8 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative overflow-hidden rounded-[2.5rem] bg-[#17130d] p-6 text-[#fff8ec] shadow-2xl shadow-[#17130d]/20 md:p-8">
            <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="absolute -bottom-24 left-8 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
            <p className="relative font-mono text-xs uppercase tracking-[0.28em] text-amber-300">Brief in. Bid out.</p>
            <h2 className="relative mt-5 max-w-xl font-heading text-4xl font-semibold leading-[1.02] md:text-6xl">
              Turn a client message into a priced proposal.
            </h2>
            <p className="relative mt-5 max-w-md text-sm leading-7 text-[#d9cab2]">
              Paste the real brief. The app builds a proposal, packages, scope, risks, and evidence in one run.
            </p>
            <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["Evidence", "Close cases or honest gaps"],
                ["Pricing", "Scope-day guardrails"],
                ["Questions", "Only 3 optional boosts"],
              ].map(([label, value]) => (
                <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur" key={label}>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-amber-200">{label}</p>
                  <p className="mt-2 text-sm font-semibold leading-5">{value}</p>
                </div>
              ))}
            </div>
          </aside>

          <form
            className="rounded-[2.5rem] border border-[#d7c7ae] bg-[#fffdf8]/95 p-5 shadow-2xl shadow-amber-950/10 backdrop-blur md:p-7"
            onSubmit={submit}
          >
            <label className="block">
              <span className="font-heading text-2xl font-semibold text-[#17130d] md:text-4xl">Paste the client brief</span>
              <span className="mt-2 block text-sm leading-6 text-slate-600">Use the actual message from Upwork, Fiverr, email, or WhatsApp.</span>
              <textarea
                className="mt-5 min-h-[21rem] w-full resize-y rounded-[1.75rem] border border-[#ded0bb] bg-[#fbf7ef] p-5 text-base leading-7 text-[#17130d] outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-200/70"
                onChange={(event) => setBrief(event.target.value)}
                placeholder="Paste the real client message here..."
                value={brief}
              />
            </label>

            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="text-sm font-semibold text-[#17130d]">
                Market
                <select
                  className="mt-2 w-full rounded-2xl border border-[#ded0bb] bg-white p-3 text-sm text-[#17130d] outline-none focus:border-amber-500"
                  onChange={(event) => setRegion(event.target.value)}
                  value={region}
                >
                  <option>US/global USD</option>
                  <option>South Asia budget-sensitive</option>
                  <option>EU premium</option>
                  <option>Remote startup</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-[#17130d]">
                Timeline
                <select
                  className="mt-2 w-full rounded-2xl border border-[#ded0bb] bg-white p-3 text-sm text-[#17130d] outline-none focus:border-amber-500"
                  onChange={(event) => setUrgency(event.target.value)}
                  value={urgency}
                >
                  <option>normal</option>
                  <option>rush</option>
                  <option>flexible</option>
                </select>
              </label>

              <button
                className="rounded-2xl bg-[#17130d] px-6 py-4 font-heading text-base font-bold text-white shadow-lg shadow-amber-950/20 transition hover:bg-amber-400 hover:text-[#17130d] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                {loading ? "Preparing..." : "Generate Bid"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
