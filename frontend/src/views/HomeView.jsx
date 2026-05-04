const CAPABILITIES = [
  ["RAG-backed pricing", "Compares the brief with local project cases and pricing rules before estimating."],
  ["Bid strategy", "Explains positioning, winning angle, delivery approach, and negotiation advice."],
  ["Proposal-ready output", "Generates proposal, scope, pricing, and client reply in one flow."],
  ["Accuracy boosts", "Asks at most 3 optional questions when details can materially improve the bid."],
];

export function HomeView({ onExample, onStart }) {
  const examples = [
    "Build an ecommerce store for a boutique clothing brand with Stripe checkout, product variants, customer accounts, and order admin.",
    "Create a mobile app MVP for a fitness coach with onboarding, workout plans, reminders, and progress tracking.",
    "Design a KPI dashboard from Google Sheets and CSV exports with cleanup, filters, charts, and weekly reporting.",
  ];

  return (
    <div className="grid gap-10">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-6 text-white shadow-2xl shadow-amber-900/10 md:p-10">
        <div className="absolute right-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[20%] h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.35em] text-amber-300">Bid intelligence studio</p>
            <h1 className="mt-5 max-w-4xl font-heading text-5xl font-semibold leading-[0.95] md:text-7xl">
              A serious GenAI workspace for freelance bids.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Generate a complete bid package, inspect the RAG evidence, understand the strategy, and improve accuracy without getting trapped in a wizard.
            </p>
            <button
              className="mt-8 rounded-full bg-amber-400 px-6 py-3 font-heading font-bold text-slate-950 transition hover:bg-amber-300"
              onClick={onStart}
              type="button"
            >
              Start generating
            </button>
          </div>

          <div className="rounded-[2rem] bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
            <p className="font-heading text-xl font-semibold">Studio flow</p>
            <div className="mt-5 grid gap-3">
              {["Paste brief", "Retrieve knowledge", "Build bid package", "Review strategy", "Improve if needed"].map((item, index) => (
                <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3" key={item}>
                  <span className="grid size-8 place-items-center rounded-full bg-amber-300 font-mono text-sm text-slate-950">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-100">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {CAPABILITIES.map(([title, body]) => (
          <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#eadfce]" key={title}>
            <p className="font-heading text-lg font-semibold text-slate-950">{title}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#eadfce]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-amber-700">Demo briefs</p>
            <h2 className="mt-2 font-heading text-3xl font-semibold text-slate-950">Try a realistic brief</h2>
          </div>
          <button className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white" onClick={onStart} type="button">
            Use your own
          </button>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {examples.map((example) => (
            <button
              className="rounded-3xl bg-[#fbf6ed] p-4 text-left text-sm leading-6 text-slate-700 ring-1 ring-[#eadfce] transition hover:bg-amber-100"
              key={example}
              onClick={() => onExample(example)}
              type="button"
            >
              {example}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
