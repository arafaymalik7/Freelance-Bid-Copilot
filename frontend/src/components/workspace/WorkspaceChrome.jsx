import { WORKSPACE_STAGES } from "../../hooks/useBidWorkspace.js";

function stageState(stage, activeStage) {
  const activeIndex = WORKSPACE_STAGES.findIndex((item) => item.id === activeStage);
  const stageIndex = WORKSPACE_STAGES.findIndex((item) => item.id === stage.id);

  if (stageIndex < activeIndex) {
    return "complete";
  }

  if (stage.id === activeStage) {
    return "active";
  }

  return "pending";
}

export function StepRail({ activeStage }) {
  return (
    <aside className="rounded-[1.5rem] border border-navy-700 bg-navy-900/75 p-4 lg:sticky lg:top-24">
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.28em] text-slate-500">Workspace</p>
      <div className="grid gap-2">
        {WORKSPACE_STAGES.map((stage, index) => {
          const state = stageState(stage, activeStage);
          return (
            <div
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                state === "active"
                  ? "bg-accent-500 text-navy-950"
                  : state === "complete"
                    ? "bg-emerald-400/10 text-emerald-200"
                    : "bg-navy-950/50 text-slate-500"
              }`}
              key={stage.id}
            >
              <span className="grid size-7 place-items-center rounded-full border border-current/30 font-mono text-xs">
                {index + 1}
              </span>
              <span className="font-heading text-sm font-semibold">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export function SummaryBar({ workspace, bidPackage, evaluation }) {
  const classification = workspace?.classification;
  const readiness = workspace?.readiness;
  const sourcesCount = workspace?.ragContext?.source_ids?.length || 0;

  return (
    <section className="rounded-[1.5rem] border border-navy-700 bg-navy-900/80 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Category</p>
          <p className="mt-1 font-heading text-lg font-semibold text-white">
            {classification?.category?.replaceAll("_", " ") || "Analyzing"}
          </p>
          <p className="text-sm text-slate-400">{classification?.subcategory || "subcategory pending"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Readiness</p>
          <p className="mt-1 font-heading text-lg font-semibold text-white">{readiness?.score ?? 0}/100</p>
          <p className="text-sm text-slate-400">{readiness?.status?.replaceAll("_", " ") || "pending"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">RAG Sources</p>
          <p className="mt-1 font-heading text-lg font-semibold text-white">{sourcesCount}</p>
          <p className="text-sm text-slate-400">local knowledge records</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Package</p>
          <p className="mt-1 font-heading text-lg font-semibold text-white">
            {bidPackage ? "Generated" : "Not generated"}
          </p>
          <p className="text-sm text-slate-400">
            {evaluation ? `Quality ${evaluation.overall_score}/100` : "scope, pricing, proposal"}
          </p>
        </div>
      </div>
    </section>
  );
}
