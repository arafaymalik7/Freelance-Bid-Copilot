export function ScopeCard({ scope, id }) {
  return (
    <section className="fade-in rounded-3xl border border-navy-700 bg-navy-800 p-6 shadow-xl" id={id}>
      <p className="text-xs uppercase tracking-[0.28em] text-navy-500">Project Scope</p>
      <blockquote className="mt-4 border-l-4 border-accent-500 pl-4 text-lg leading-8 text-slate-100">
        {scope.project_summary}
      </blockquote>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-400/20 bg-navy-900/40 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-emerald-200">In Scope</p>
          <div className="mt-4 space-y-3">
            {scope.in_scope.map((item) => (
              <div className="flex items-start gap-3 text-slate-200" key={item}>
                <span className="text-emerald-400">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-400/20 bg-navy-900/40 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-rose-200">Out Of Scope</p>
          <div className="mt-4 space-y-3">
            {scope.out_of_scope.map((item) => (
              <div className="flex items-start gap-3 text-slate-200" key={item}>
                <span className="text-rose-400">✕</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm uppercase tracking-[0.24em] text-navy-500">Milestones</p>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
          {scope.milestones.map((milestone) => (
            <article className="min-w-64 rounded-2xl border border-navy-700 bg-navy-900/60 p-5" key={milestone.name}>
              <p className="text-xs uppercase tracking-[0.24em] text-accent-300">{milestone.name}</p>
              <p className="mt-3 text-white">{milestone.deliverable}</p>
              <p className="mt-4 text-sm text-slate-400">{milestone.estimated_days} days</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-navy-700 bg-navy-900/60 p-4 text-sm text-slate-300 md:grid-cols-3">
        <p>{scope.total_estimated_days} days total</p>
        <p>{scope.recommended_revision_rounds} revision rounds</p>
        <p>{scope.payment_structure}</p>
      </div>
    </section>
  );
}

