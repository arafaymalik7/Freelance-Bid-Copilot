const CATEGORY_STYLES = {
  web_development: "bg-sky-500/15 text-sky-200 border border-sky-400/30",
  mobile_app: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
  ui_ux_design: "bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/30",
  content_writing: "bg-amber-500/15 text-amber-200 border border-amber-400/30",
  data_analytics: "bg-orange-500/15 text-orange-200 border border-orange-400/30",
  other: "bg-slate-500/15 text-slate-200 border border-slate-400/30",
};

export function ClassificationCard({ classification }) {
  return (
    <section className="fade-in rounded-3xl border border-navy-700 bg-navy-800 p-6 shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-navy-500">Project Classification</p>
          <div
            className={`mt-3 inline-flex rounded-full px-4 py-2 text-sm font-medium capitalize ${
              CATEGORY_STYLES[classification.category] || CATEGORY_STYLES.other
            }`}
          >
            {classification.category.replaceAll("_", " ")}
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
            <span>Confidence</span>
            <span>{Math.round(classification.confidence * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-navy-700">
            <div
              className="h-full rounded-full bg-accent-500"
              style={{ width: `${Math.round(classification.confidence * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <p className="mt-5 italic text-slate-300">{classification.reasoning}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {classification.typical_stack.map((item) => (
          <span className="rounded-full bg-navy-700 px-3 py-1 text-xs text-accent-300" key={item}>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

