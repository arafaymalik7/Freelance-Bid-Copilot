function TierCard({ title, price, includes, timeline, featured, titleAttribute }) {
  return (
    <article
      className={`rounded-3xl p-5 ${
        featured
          ? "border-2 border-accent-500 bg-accent-600/20 shadow-[0_20px_60px_-24px_rgba(99,102,241,0.8)]"
          : "border border-navy-700 bg-navy-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs uppercase tracking-[0.26em] ${featured ? "text-accent-200" : "text-navy-500"}`} title={titleAttribute}>
            {title}
          </p>
          {featured ? (
            <span className="mt-3 inline-flex rounded-full bg-accent-500 px-3 py-1 text-xs font-medium text-white">
              Most popular
            </span>
          ) : null}
        </div>
      </div>

      <p className={`mt-6 font-heading font-semibold text-white ${featured ? "text-4xl" : "text-3xl"}`}>{price}</p>
      <p className="mt-3 text-slate-300">{includes}</p>
      <p className="mt-6 text-sm text-slate-400">{timeline}</p>
    </article>
  );
}

export function PricingCard({ pricing, id }) {
  return (
    <section className="fade-in rounded-3xl border border-navy-700 bg-navy-800 p-6 shadow-xl" id={id}>
      <p className="text-xs uppercase tracking-[0.28em] text-navy-500">Pricing Strategy</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <TierCard
          includes={pricing.basic.includes}
          price={`$${pricing.basic.min} - $${pricing.basic.max}`}
          timeline={pricing.basic.timeline}
          title="Basic"
        />
        <TierCard
          featured
          includes={pricing.recommended.includes}
          price={`$${pricing.recommended.min} - $${pricing.recommended.max}`}
          timeline={pricing.recommended.timeline}
          title="Recommended ⭐"
          titleAttribute="Best balance of features, quality, and price for most clients"
        />
        <TierCard
          includes={pricing.premium.includes}
          price={`$${pricing.premium.min} - $${pricing.premium.max}`}
          timeline={pricing.premium.timeline}
          title="Premium / Rush"
        />
      </div>

      <div className="mt-6 grid gap-3">
        {pricing.pricing_notes.map((note) => (
          <div className="rounded-2xl border border-navy-700 bg-navy-900/45 px-4 py-3 text-sm text-slate-300" key={note}>
            💡 {note}
          </div>
        ))}
      </div>
    </section>
  );
}

