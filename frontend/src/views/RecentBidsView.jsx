function formatRange(tier) {
  return tier ? `$${tier.min} - $${tier.max}` : "No price";
}

export function RecentBidsView({ onClear, onOpenBid, onStart, recentBids }) {
  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#eadfce]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-amber-700">Recent</p>
            <h1 className="mt-2 font-heading text-4xl font-semibold text-slate-950">Saved bid sessions</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Generated bids are stored locally in this browser for demo continuity. No server account is required.
            </p>
          </div>
          {recentBids.length ? (
            <button className="rounded-full border border-[#eadfce] px-4 py-2 text-sm font-semibold text-slate-600" onClick={onClear} type="button">
              Clear recent
            </button>
          ) : null}
        </div>
      </section>

      {recentBids.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {recentBids.map((bid) => (
            <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#eadfce]" key={bid.id}>
              <p className="font-heading text-xl font-semibold text-slate-950">{bid.title}</p>
              <p className="mt-2 text-sm text-slate-500">
                {bid.category?.replaceAll("_", " ")} · {formatRange(bid.price_range)} · {bid.timeline_days || "?"} days
              </p>
              <button
                className="mt-5 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
                onClick={() => onOpenBid(bid)}
                type="button"
              >
                Open bid
              </button>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-[#eadfce]">
          <p className="font-heading text-2xl font-semibold text-slate-950">No saved bids yet</p>
          <p className="mt-2 text-slate-600">Generate a bid and it will appear here automatically.</p>
          <button className="mt-5 rounded-full bg-amber-400 px-5 py-2.5 font-semibold text-slate-950" onClick={onStart} type="button">
            Generate first bid
          </button>
        </section>
      )}
    </div>
  );
}
