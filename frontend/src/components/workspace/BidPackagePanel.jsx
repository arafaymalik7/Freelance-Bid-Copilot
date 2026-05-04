import { useState } from "react";

function CopyButton({ label = "Copy", text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      className="rounded-xl border border-navy-600 px-3 py-2 text-sm text-slate-300 transition hover:border-accent-400 hover:text-white"
      onClick={copy}
      type="button"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-accent-500 text-navy-950" : "bg-navy-950 text-slate-400 hover:text-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ScopeTab({ scope }) {
  return (
    <div className="grid gap-5">
      <p className="text-base leading-7 text-slate-300">{scope.project_summary}</p>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-3 font-heading font-semibold text-white">In Scope</p>
          <ul className="grid gap-2 text-sm text-slate-300">
            {scope.in_scope.map((item) => (
              <li className="rounded-xl bg-navy-950/70 p-3" key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 font-heading font-semibold text-white">Out Of Scope</p>
          <ul className="grid gap-2 text-sm text-slate-300">
            {scope.out_of_scope.map((item) => (
              <li className="rounded-xl bg-navy-950/70 p-3" key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <p className="mb-3 font-heading font-semibold text-white">Milestones</p>
        <div className="grid gap-3">
          {scope.milestones.map((milestone) => (
            <article className="rounded-2xl border border-navy-700 bg-navy-950/60 p-4" key={milestone.name}>
              <div className="flex flex-wrap justify-between gap-3">
                <h3 className="font-heading font-semibold text-white">{milestone.name}</h3>
                <span className="font-mono text-sm text-accent-300">{milestone.estimated_days} days</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{milestone.deliverable}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function PricingTier({ name, tier, featured }) {
  return (
    <article className={`rounded-2xl border p-4 ${featured ? "border-accent-400 bg-accent-500/10" : "border-navy-700 bg-navy-950/60"}`}>
      <p className="font-heading text-lg font-semibold text-white">{name}</p>
      <p className="mt-3 font-mono text-2xl text-accent-300">${tier.min} - ${tier.max}</p>
      <p className="mt-3 text-sm leading-6 text-slate-300">{tier.includes}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">{tier.timeline}</p>
    </article>
  );
}

function PricingTab({ pricing }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 xl:grid-cols-3">
        <PricingTier name="Basic" tier={pricing.basic} />
        <PricingTier featured name="Recommended" tier={pricing.recommended} />
        <PricingTier name="Premium" tier={pricing.premium} />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-3 font-heading font-semibold text-white">Pricing Basis</p>
          <ul className="grid gap-2 text-sm text-slate-300">
            {(pricing.pricing_basis || pricing.pricing_notes).map((item) => (
              <li className="rounded-xl bg-navy-950/70 p-3" key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 font-heading font-semibold text-white">Would Increase Price</p>
          <ul className="grid gap-2 text-sm text-slate-300">
            {(pricing.what_would_increase_price || pricing.pricing_notes).map((item) => (
              <li className="rounded-xl bg-navy-950/70 p-3" key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ProposalTab({ proposal }) {
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Subject</p>
          <h3 className="mt-1 font-heading text-xl font-semibold text-white">{proposal.subject_line}</h3>
        </div>
        <CopyButton label="Copy Proposal" text={proposal.proposal_draft} />
      </div>
      <pre className="whitespace-pre-wrap rounded-2xl border border-navy-700 bg-navy-950/70 p-4 font-sans text-sm leading-7 text-slate-200">
        {proposal.proposal_draft}
      </pre>
      <div className="rounded-2xl border border-navy-700 bg-navy-950/70 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-heading font-semibold text-white">Short Client Reply</p>
          <CopyButton label="Copy Reply" text={proposal.client_reply} />
        </div>
        <p className="text-sm leading-7 text-slate-300">{proposal.client_reply}</p>
      </div>
    </div>
  );
}

function QualityPanel({ evaluation, loading, onImproveProposal }) {
  if (!evaluation) {
    return null;
  }

  return (
    <aside className="rounded-[1.5rem] border border-navy-700 bg-navy-900/75 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Quality Score</p>
      <p className="mt-2 font-heading text-5xl font-semibold text-white">{evaluation.overall_score}</p>
      <p className="mt-2 text-sm text-slate-400">{evaluation.verdict}</p>
      <div className="mt-5 grid gap-2">
        {Object.entries(evaluation.scores || {}).map(([key, value]) => (
          <div className="flex items-center justify-between rounded-xl bg-navy-950/70 px-3 py-2 text-sm" key={key}>
            <span className="text-slate-400">{key.replaceAll("_", " ")}</span>
            <span className="font-mono text-accent-300">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <p className="mb-3 font-heading font-semibold text-white">Recommendations</p>
        <ul className="grid gap-2 text-sm text-slate-300">
          {(evaluation.recommendations || []).map((item) => (
            <li className="rounded-xl bg-navy-950/70 p-3" key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <button
        className="mt-5 w-full rounded-2xl bg-accent-500 px-5 py-3 font-heading font-semibold text-navy-950 transition hover:bg-accent-400 disabled:opacity-50"
        disabled={loading}
        onClick={onImproveProposal}
        type="button"
      >
        Improve Proposal
      </button>
    </aside>
  );
}

export function BidPackagePanel({ bidPackage, evaluation, improvedProposal, loading, onImproveProposal }) {
  const [tab, setTab] = useState("scope");
  const activeProposal = improvedProposal || bidPackage.proposal;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
      <section className="rounded-[1.5rem] border border-navy-700 bg-navy-900/75 p-5">
        <div className="mb-5 flex flex-wrap gap-2">
          <TabButton active={tab === "scope"} onClick={() => setTab("scope")}>Scope</TabButton>
          <TabButton active={tab === "pricing"} onClick={() => setTab("pricing")}>Pricing</TabButton>
          <TabButton active={tab === "proposal"} onClick={() => setTab("proposal")}>Proposal</TabButton>
        </div>

        {tab === "scope" ? <ScopeTab scope={bidPackage.scope} /> : null}
        {tab === "pricing" ? <PricingTab pricing={bidPackage.pricing} /> : null}
        {tab === "proposal" ? <ProposalTab proposal={activeProposal} /> : null}

        {improvedProposal ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
            <p className="font-heading font-semibold text-emerald-100">Improvement Applied</p>
            <ul className="mt-3 grid gap-2 text-sm text-emerald-50">
              {improvedProposal.changes_made?.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <QualityPanel evaluation={evaluation} loading={loading} onImproveProposal={onImproveProposal} />
    </div>
  );
}
