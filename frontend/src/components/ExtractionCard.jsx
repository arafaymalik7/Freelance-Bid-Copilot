import { useState } from "react";

const SIZE_STYLES = {
  small: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
  medium: "bg-amber-500/15 text-amber-200 border border-amber-400/30",
  large: "bg-rose-500/15 text-rose-200 border border-rose-400/30",
};

const EXPERIENCE_STYLES = {
  beginner: "bg-sky-500/15 text-sky-200 border border-sky-400/30",
  intermediate: "bg-violet-500/15 text-violet-200 border border-violet-400/30",
  expert: "bg-teal-500/15 text-teal-200 border border-teal-400/30",
};

export function ExtractionCard({ extraction }) {
  const [showAssumptions, setShowAssumptions] = useState(false);

  return (
    <section className="fade-in rounded-3xl border border-navy-700 bg-navy-800 p-6 shadow-xl">
      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-navy-500">What You&apos;re Building</p>
          <p className="mt-3 text-xl font-semibold text-white">{extraction.main_deliverable}</p>

          <div className="mt-6">
            <p className="text-sm uppercase tracking-[0.24em] text-navy-500">Features Detected</p>
            <div className="mt-3 space-y-3">
              {extraction.features.map((feature) => (
                <div className="flex items-start gap-3" key={feature}>
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  <span className="text-slate-200">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm uppercase tracking-[0.24em] text-navy-500">Technical Requirements</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {extraction.technical_requirements.map((item) => (
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs text-sky-200" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-navy-700 bg-navy-900/50 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-navy-500">Deadline</p>
            <p className="mt-2 text-slate-200">
              {extraction.deadline_hint || <span className="italic text-slate-500">Not specified</span>}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-navy-500">Budget</p>
            <p className="mt-2 text-slate-200">
              {extraction.budget_hint || <span className="italic text-slate-500">Not specified</span>}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                SIZE_STYLES[extraction.project_size]
              }`}
            >
              {extraction.project_size}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                EXPERIENCE_STYLES[extraction.client_experience_level]
              }`}
            >
              {extraction.client_experience_level}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-navy-700 pt-6">
        <button
          className="flex items-center gap-2 text-sm font-medium text-amber-200 transition hover:text-white"
          onClick={() => setShowAssumptions((current) => !current)}
          type="button"
        >
          <span>{showAssumptions ? "−" : "+"}</span>
          Assumptions
        </button>

        {showAssumptions ? (
          <div className="mt-4 space-y-3">
            {extraction.assumptions.map((assumption) => (
              <div className="flex items-start gap-3 text-sm text-amber-100" key={assumption}>
                <span>⚠</span>
                <span>{assumption}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

