import { useEffect, useMemo, useState } from "react";

const PACKAGE_LABELS = {
  basic: "Basic",
  recommended: "Recommended",
  premium: "Premium",
};

const IMPACT_STYLES = {
  price: "bg-amber-100 text-amber-800",
  timeline: "bg-cyan-100 text-cyan-800",
  scope: "bg-emerald-100 text-emerald-800",
  risk: "bg-rose-100 text-rose-800",
};

function formatCurrency(value, currency = "USD") {
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value));
}

function formatRange(tier, currency = "USD") {
  const min = formatCurrency(tier?.min, currency);
  const max = formatCurrency(tier?.max, currency);

  if (min && max) {
    return `${min} - ${max}`;
  }

  return min || max || null;
}

function formatProjectRange(priceRange) {
  if (!priceRange || typeof priceRange !== "object") {
    return null;
  }

  return formatRange({
    min: priceRange.low ?? priceRange.min,
    max: priceRange.high ?? priceRange.max,
  }, priceRange.currency || "USD");
}

function list(items) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function requiredIssue(result) {
  if (!hasText(result?.package?.proposal?.proposal_draft)) {
    return "The bid package did not include a proposal draft. Regenerate the bid or check the backend logs.";
  }

  if (!result?.package?.pricing?.recommended?.min || !result?.package?.pricing?.recommended?.max) {
    return "The bid package did not include recommended pricing. Regenerate the bid or check the backend logs.";
  }

  return null;
}

function selectedProposalForPackage(result, selectedPackage) {
  return result?.package_proposals?.[selectedPackage] || result?.package?.proposal || {};
}

function CopyButton({ children, text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      className="rounded-full bg-[#17130d] px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-400 hover:text-[#17130d] disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!text}
      onClick={copy}
      type="button"
    >
      {copied ? "Copied" : children}
    </button>
  );
}

function PackageSwitcher({ compact = false, onSelect, packageOptions = {}, pricing, selectedPackage }) {
  const currency = pricing.currency || "USD";
  const availableTiers = ["basic", "recommended", "premium"].filter((tierName) => pricing[tierName]);

  return (
    <section className="rounded-[2rem] border border-[#d8c8ae] bg-[#fffdf8]/90 p-3 shadow-xl shadow-amber-950/8 backdrop-blur">
      <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-3"}`}>
        {availableTiers.map((tierName) => {
          const tier = pricing[tierName];
          const range = formatRange(tier, currency);

          return (
            <button
              className={`relative overflow-hidden rounded-[1.5rem] p-4 text-left transition ${
                selectedPackage === tierName
                  ? "bg-[#17130d] text-white shadow-xl shadow-[#17130d]/20"
                  : "bg-[#f7efe2] text-[#17130d] hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
              }`}
              key={tierName}
              onClick={() => onSelect(tierName)}
              type="button"
            >
              {selectedPackage === tierName ? <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 to-cyan-200" /> : null}
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] opacity-70">{PACKAGE_LABELS[tierName]}</p>
              {hasText(packageOptions[tierName]?.label) ? (
                <p className="mt-2 font-heading text-lg font-semibold">{packageOptions[tierName].label}</p>
              ) : null}
              {range ? <p className="mt-3 font-heading text-2xl font-bold">{range}</p> : null}
              {hasText(tier.timeline) ? (
                <p className={`mt-2 text-xs ${selectedPackage === tierName ? "text-white/70" : "text-slate-500"}`}>{tier.timeline}</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TopBar({ feedbackReceipt, hasRecent, onNewBid, onSaveBid, onShowRecent, onSubmitFeedback, priceRange, proposal, selectedPackage }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#17130d]/94 px-4 py-3 text-[#fff8ec] shadow-2xl shadow-[#17130d]/20 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-amber-300">Deal room</p>
          <h1 className="font-heading text-lg font-semibold text-[#fff8ec] md:text-xl">
            {proposal.subject_line}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white">
            {PACKAGE_LABELS[selectedPackage]}{priceRange ? ` - ${priceRange}` : ""}
          </span>
          <button className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white hover:text-[#17130d]" onClick={onSaveBid} type="button">
            Save
          </button>
          {hasRecent ? (
            <button className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white hover:text-[#17130d]" onClick={onShowRecent} type="button">
              Recent
            </button>
          ) : null}
          <button className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white hover:text-[#17130d]" onClick={() => onSubmitFeedback({ rating: 5, labels: ["proposal_good"] })} type="button">
            Useful
          </button>
          <button className="rounded-full bg-amber-300 px-4 py-2 text-xs font-bold text-[#17130d] hover:bg-cyan-200" onClick={onNewBid} type="button">
            New brief
          </button>
        </div>
      </div>
      {feedbackReceipt?.accepted ? (
        <p className="mx-auto mt-2 max-w-6xl text-xs font-semibold text-emerald-200">Feedback saved</p>
      ) : null}
    </header>
  );
}

function DealBriefing({ result, selectedPackage, selectedRange }) {
  const snapshot = result.deal_snapshot || {};
  const evidence = result.evidence_board || {};
  const retrievalQuality = evidence.retrieval_quality || result.retrieval_quality || result.estimate_evidence?.retrieval_quality || {};
  const closeCount = list(evidence.similar_work || result.similar_projects).length;
  const confidence = result.confidence || {};
  const packageOption = result.package_options?.[selectedPackage] || {};
  const strategy = result.bid_strategy || {};
  const packageLabel = packageOption.label || PACKAGE_LABELS[selectedPackage];

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#17130d] p-6 text-[#fff8ec] shadow-2xl shadow-[#17130d]/20">
        <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute -bottom-20 left-24 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-amber-300">Deal briefing</p>
          {hasText(snapshot.project_type) ? (
            <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight md:text-4xl">
              {snapshot.project_type}
            </h2>
          ) : null}
          {hasText(strategy.positioning) ? (
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#d7c8af]">{strategy.positioning}</p>
          ) : null}
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {confidence.label ? (
              <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-amber-200">Confidence</p>
                <p className="mt-2 truncate font-heading text-xl font-semibold md:text-2xl">{confidence.label}</p>
                {Number.isFinite(confidence.score) ? <p className="mt-1 text-xs text-white/60">{confidence.score}/100</p> : null}
              </div>
            ) : null}
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.08] p-4">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-amber-200">Package</p>
              <p className="mt-2 line-clamp-2 font-heading text-lg font-semibold leading-tight md:text-xl">{packageLabel}</p>
              {selectedRange ? <p className="mt-1 text-xs text-white/60">{selectedRange}</p> : null}
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.08] p-4">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-amber-200">Evidence</p>
              <p className="mt-2 truncate font-heading text-xl font-semibold capitalize md:text-2xl">
                {hasText(retrievalQuality.coverage_level) ? retrievalQuality.coverage_level : closeCount || "No close"}
              </p>
              <p className="mt-1 text-xs text-white/60">
                {closeCount ? `${closeCount} close case${closeCount === 1 ? "" : "s"}` : "uses rules + risks"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {(hasText(packageOption.proposal_angle) || hasText(strategy.negotiation_advice)) ? (
        <aside className="rounded-[2rem] border border-[#d8c8ae] bg-[#fffdf8]/90 p-6 shadow-xl shadow-amber-950/8">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-amber-700">Bid strategy</p>
          {hasText(packageOption.proposal_angle) ? (
            <p className="mt-4 font-heading text-xl font-semibold leading-7 text-[#17130d]">{packageOption.proposal_angle}</p>
          ) : null}
          {hasText(strategy.negotiation_advice) ? (
            <p className="mt-4 text-sm leading-7 text-slate-600">{strategy.negotiation_advice}</p>
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}

function ProposalCanvas({ proposal, result, selectedPackage }) {
  const pricing = result.package.pricing;
  const selectedTier = pricing[selectedPackage] || pricing.recommended;
  const selectedRange = formatRange(selectedTier, pricing.currency);
  const sanity = pricing.pricing_sanity || result.pricing_sanity;

  return (
    <article className="relative overflow-hidden rounded-[2.25rem] border border-[#d8c8ae] bg-[#fffdf8] shadow-2xl shadow-amber-950/12">
      <div className="absolute right-0 top-0 h-48 w-48 rounded-bl-full bg-amber-100/60" />
      <header className="relative border-b border-[#eee2cf] p-5 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-amber-700">Client-ready proposal</p>
            <h2 className="mt-3 max-w-3xl font-heading text-3xl font-semibold leading-tight text-[#17130d] md:text-5xl">
              {proposal.subject_line}
            </h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {selectedRange ? (
                <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900">{selectedRange}</span>
              ) : null}
              {hasText(selectedTier?.timeline) ? (
                <span className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-bold text-cyan-900">{selectedTier.timeline}</span>
              ) : null}
              {result.confidence?.label ? (
                <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-900">{result.confidence.label} confidence</span>
              ) : null}
              {sanity?.clamped ? (
                <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-bold text-rose-900">Price sanity checked</span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={proposal.proposal_draft}>Copy proposal</CopyButton>
          </div>
        </div>
      </header>

      <div className="relative grid gap-6 p-5 md:p-8">
        <section className="rounded-[1.75rem] border border-[#eadbc4] bg-white p-5 shadow-inner shadow-amber-950/5 md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-rose-300" />
            <span className="h-3 w-3 rounded-full bg-amber-300" />
            <span className="h-3 w-3 rounded-full bg-emerald-300" />
            <span className="ml-2 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">proposal document</span>
          </div>
          <p className="whitespace-pre-line text-base leading-8 text-slate-800 md:text-lg">{proposal.proposal_draft}</p>
        </section>

      </div>
    </article>
  );
}

function OpeningReplyCard({ proposal }) {
  if (!hasText(proposal?.client_reply)) {
    return null;
  }

  return (
    <section className="rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-5 shadow-xl shadow-cyan-950/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-cyan-800">Opening reply</p>
          <h3 className="mt-2 font-heading text-xl font-semibold text-[#17130d]">Short client response</h3>
        </div>
        <CopyButton text={proposal.client_reply}>Copy opening reply</CopyButton>
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800/80">
        Use this as the first Upwork/Fiverr/chat reply before sending the full proposal.
      </p>
      <p className="mt-4 text-sm leading-7 text-slate-700">{proposal.client_reply}</p>
    </section>
  );
}

function PackageFocusCard({ result, selectedPackage }) {
  const packageOption = result.package_options?.[selectedPackage] || {};

  if (!hasText(packageOption.proposal_angle) && !hasText(packageOption.scope_summary) && !hasText(packageOption.pricing_paragraph)) {
    return null;
  }

  return (
    <section className="rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-xl shadow-amber-950/5">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-amber-800">{PACKAGE_LABELS[selectedPackage]} package focus</p>
      {hasText(packageOption.label) ? <h3 className="mt-2 font-heading text-xl font-semibold text-[#17130d]">{packageOption.label}</h3> : null}
      {hasText(packageOption.proposal_angle) ? <p className="mt-3 text-sm leading-7 text-slate-700">{packageOption.proposal_angle}</p> : null}
      {hasText(packageOption.pricing_paragraph) ? <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{packageOption.pricing_paragraph}</p> : null}
      {list(packageOption.tradeoffs).length ? (
        <div className="mt-4 grid gap-2">
          {list(packageOption.tradeoffs).slice(0, 2).map((tradeoff) => (
            <p className="rounded-2xl bg-white px-4 py-3 text-xs leading-5 text-slate-600" key={tradeoff}>{tradeoff}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ScopeMiniCard({ result }) {
  const scope = result.package.scope || {};
  const assumptions = list(result.proposal_sections?.assumptions?.length ? result.proposal_sections.assumptions : result.assumptions);

  if (!hasText(scope.project_summary) && !list(scope.milestones).length && !assumptions.length) {
    return null;
  }

  return (
    <section className="rounded-[2rem] border border-[#d8c8ae] bg-[#fffdf8]/90 p-5 shadow-xl shadow-amber-950/8">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-amber-800">Bid details</p>
      {hasText(scope.project_summary) ? <p className="mt-3 text-sm leading-7 text-slate-700">{scope.project_summary}</p> : null}
      {list(scope.milestones).length ? (
        <div className="mt-4 grid gap-2">
          {list(scope.milestones).slice(0, 3).map((milestone, index) => (
            <div className="rounded-2xl bg-[#fbf7ef] px-4 py-3" key={`${milestone.name}-${index}`}>
              {hasText(milestone.name) ? <p className="font-heading text-sm font-semibold text-[#17130d]">{milestone.name}</p> : null}
              {Number.isFinite(milestone.estimated_days) ? <p className="mt-1 text-xs font-bold text-amber-800">{milestone.estimated_days} days</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      {assumptions.length ? (
        <details className="mt-4 rounded-2xl bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold text-[#17130d]">Assumptions used</summary>
          <div className="mt-3 grid gap-2">
            {assumptions.slice(0, 5).map((assumption) => (
              <p className="text-xs leading-5 text-slate-600" key={assumption}>{assumption}</p>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function ActionPanel({ hasBoosts, hasEvidence, onOpenPanel }) {
  return (
    <section className="rounded-[2rem] border border-[#d8c8ae] bg-[#17130d] p-5 text-[#fff8ec] shadow-xl shadow-[#17130d]/15">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-amber-300">Review tools</p>
      <div className="mt-4 grid gap-2">
        {hasEvidence ? (
          <button className="rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-bold transition hover:bg-white hover:text-[#17130d]" onClick={() => onOpenPanel("evidence")} type="button">
            Evidence Board
          </button>
        ) : null}
        {hasBoosts ? (
          <button className="rounded-2xl bg-white/10 px-4 py-3 text-left text-sm font-bold transition hover:bg-white hover:text-[#17130d]" onClick={() => onOpenPanel("boosts")} type="button">
            Precision Boosts
          </button>
        ) : null}
      </div>
    </section>
  );
}

function EvidenceBoard({ result }) {
  const evidence = result.evidence_board || {};
  const retrievalQuality = evidence.retrieval_quality || result.retrieval_quality || result.estimate_evidence?.retrieval_quality || {};
  const similarWork = list(evidence.similar_work || result.similar_projects);
  const relatedReferences = list(evidence.related_references);
  const pricingLogic = list(evidence.pricing_logic || result.estimate_evidence?.pricing_basis);
  const scopeLogic = list(evidence.scope_logic || result.estimate_evidence?.scope_patterns);
  const risks = list(evidence.risks_considered || result.risk_playbook?.risks);
  const hasEvidence = similarWork.length || relatedReferences.length || pricingLogic.length || scopeLogic.length || risks.length;

  if (!hasEvidence) {
    return null;
  }

  return (
    <div className="grid gap-5">
      {hasText(retrievalQuality.coverage_level) ? (
        <section className="rounded-2xl bg-[#17130d] p-4 text-[#fff8ec]">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-amber-300">Knowledge coverage</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <p className="font-heading text-2xl font-semibold capitalize">{retrievalQuality.coverage_level}</p>
              <p className="mt-1 text-xs text-white/60">coverage level</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-semibold">{retrievalQuality.close_matches ?? similarWork.length}</p>
              <p className="mt-1 text-xs text-white/60">close matches</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-semibold">{retrievalQuality.rules_used ?? pricingLogic.length + scopeLogic.length + risks.length}</p>
              <p className="mt-1 text-xs text-white/60">rules used</p>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="font-heading text-xl font-semibold text-[#17130d]">Close similar projects</h3>
        {similarWork.length ? (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {similarWork.slice(0, 3).map((project, index) => {
              const range = formatProjectRange(project.price_range);

              return (
                <div className="rounded-2xl bg-[#fbf7ef] p-4" key={`${project.title}-${index}`}>
                  {hasText(project.title) ? <p className="font-heading font-semibold text-[#17130d]">{project.title}</p> : null}
                  {hasText(project.relevance_explanation || project.scope_summary) ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{project.relevance_explanation || project.scope_summary}</p>
                  ) : null}
                  {range ? <p className="mt-3 text-xs font-bold text-amber-800">{range}</p> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm leading-6 text-slate-700">
            No close project case found. The estimate uses category rules, scope, risks, and assumptions instead of pretending weak matches are similar.
          </p>
        )}
      </section>

      {relatedReferences.length ? (
        <section>
          <h3 className="font-heading text-xl font-semibold text-[#17130d]">Related category references</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {relatedReferences.slice(0, 3).map((project, index) => {
              const range = formatProjectRange(project.price_range);

              return (
                <div className="rounded-2xl bg-[#fbf7ef] p-4" key={`${project.title}-${index}`}>
                  {hasText(project.title) ? <p className="font-heading font-semibold text-[#17130d]">{project.title}</p> : null}
                  {hasText(project.relevance_explanation || project.scope_summary) ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{project.relevance_explanation || project.scope_summary}</p>
                  ) : null}
                  {range ? <p className="mt-3 text-xs font-bold text-amber-800">{range}</p> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {pricingLogic.length ? (
        <section>
          <h3 className="font-heading text-xl font-semibold text-[#17130d]">Pricing logic</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {pricingLogic.slice(0, 4).map((item) => (
              <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-slate-700" key={item}>{item}</p>
            ))}
          </div>
        </section>
      ) : null}

      {scopeLogic.length || risks.length ? (
        <section className="grid gap-4 md:grid-cols-2">
          {scopeLogic.length ? (
            <div>
              <h3 className="font-heading text-xl font-semibold text-[#17130d]">Scope logic</h3>
              <div className="mt-3 grid gap-2">
                {scopeLogic.slice(0, 4).map((item) => (
                  <p className="rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm leading-6 text-slate-700" key={item}>{item}</p>
                ))}
              </div>
            </div>
          ) : null}
          {risks.length ? (
            <div>
              <h3 className="font-heading text-xl font-semibold text-[#17130d]">Risks considered</h3>
              <div className="mt-3 grid gap-2">
                {risks.slice(0, 4).map((risk) => (
                  <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900" key={risk}>{risk}</p>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function PrecisionBoosts({ loading, onImproveWithAnswers, questions = [] }) {
  const cappedQuestions = questions.slice(0, 3);
  const [answers, setAnswers] = useState({});
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    setAnswers({});
    setSkipped(false);
  }, [questions]);

  if (!cappedQuestions.length || skipped) {
    return null;
  }

  const formattedAnswers = cappedQuestions
    .map((question, index) => ({
      answer: answers[index],
      question: question.question,
    }))
    .filter((item) => item.question && item.answer && String(item.answer).trim());

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {cappedQuestions.map((question, index) => {
          const style = IMPACT_STYLES[question.impact] || IMPACT_STYLES.scope;

          return (
            <section className="rounded-[1.25rem] bg-[#fbf7ef] p-4" key={question.question}>
              <span className={`rounded-full px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] ${style}`}>
                {question.impact || "scope"}
              </span>
              <p className="mt-3 font-heading text-sm font-semibold leading-5 text-[#17130d]">{question.question}</p>
              {hasText(question.why_it_matters) ? (
                <p className="mt-2 text-xs leading-5 text-slate-600">{question.why_it_matters}</p>
              ) : null}
              {question.answer_type === "choice" && question.choices?.length ? (
                <select
                  className="mt-3 w-full rounded-2xl border border-[#ded0bb] bg-white p-3 text-sm"
                  onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))}
                  value={answers[index] || ""}
                >
                  <option value="">Leave unanswered</option>
                  {question.choices.map((choice) => (
                    <option key={choice} value={choice}>{choice}</option>
                  ))}
                </select>
              ) : question.answer_type === "yes_no" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {["Yes", "No"].map((choice) => (
                    <button
                      className={`rounded-2xl px-3 py-2 text-sm font-semibold ${
                        answers[index] === choice ? "bg-[#17130d] text-white" : "bg-white text-[#17130d]"
                      }`}
                      key={choice}
                      onClick={() => setAnswers((current) => ({ ...current, [index]: choice }))}
                      type="button"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  className="mt-3 w-full rounded-2xl border border-[#ded0bb] bg-white p-3 text-sm"
                  onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))}
                  placeholder="Type answer"
                  type={question.answer_type === "number" ? "number" : "text"}
                  value={answers[index] || ""}
                />
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-full bg-[#17130d] px-4 py-2 text-sm font-bold text-white hover:bg-amber-400 hover:text-[#17130d] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading || !formattedAnswers.length}
          onClick={() => onImproveWithAnswers(formattedAnswers)}
          type="button"
        >
          {loading ? "Improving..." : "Improve with answers"}
        </button>
        <button className="rounded-full border border-[#ded0bb] bg-white px-4 py-2 text-sm font-bold text-[#17130d]" onClick={() => setSkipped(true)} type="button">
          Skip boosts
        </button>
      </div>
    </div>
  );
}

function PanelOverlay({ children, isOpen, onClose, title }) {
  if (!isOpen || !children) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#17130d]/45 p-3 backdrop-blur-sm md:p-6" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" onClick={onClose} type="button" aria-label="Close panel backdrop" />
      <section className="relative ml-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-[#d8c8ae] bg-[#fffdf8] shadow-2xl shadow-[#17130d]/30">
        <header className="flex items-center justify-between gap-4 border-b border-[#eee2cf] px-5 py-4">
          <h2 className="font-heading text-xl font-semibold text-[#17130d]">{title}</h2>
          <button className="rounded-full bg-[#17130d] px-4 py-2 text-xs font-bold text-white hover:bg-amber-400 hover:text-[#17130d]" onClick={onClose} type="button">
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}

export function DealRoom({
  feedbackReceipt,
  loading,
  onImproveWithAnswers,
  onNewBid,
  onSaveBid,
  onShowRecent,
  onSubmitFeedback,
  recentBids = [],
  result,
}) {
  const issue = requiredIssue(result);
  const recommendedPackage = result.recommended_package || "recommended";
  const [selectedPackage, setSelectedPackage] = useState(recommendedPackage);
  const [openPanel, setOpenPanel] = useState(null);
  const questions = useMemo(() => (result.critical_questions || []).slice(0, 3), [result.critical_questions]);

  useEffect(() => {
    setSelectedPackage(recommendedPackage);
    setOpenPanel(null);
  }, [recommendedPackage, result.workspace_id]);

  if (issue) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6efe4] p-4">
        <section className="max-w-xl rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-900 shadow-xl">
          <h1 className="font-heading text-2xl font-semibold">Bid package incomplete</h1>
          <p className="mt-3 text-sm leading-6">{issue}</p>
          <button className="mt-5 rounded-full bg-red-700 px-4 py-2 text-sm font-bold text-white" onClick={onNewBid} type="button">
            Start again
          </button>
        </section>
      </main>
    );
  }

  const pricing = result.package.pricing;
  const selectedTier = pricing[selectedPackage] || pricing.recommended;
  const selectedRange = formatRange(selectedTier, pricing.currency);
  const selectedProposal = selectedProposalForPackage(result, selectedPackage);
  const evidence = result.evidence_board || {};
  const hasEvidence = list(evidence.similar_work || result.similar_projects).length ||
    list(evidence.related_references).length ||
    list(evidence.pricing_logic || result.estimate_evidence?.pricing_basis).length ||
    list(evidence.scope_logic || result.estimate_evidence?.scope_patterns).length ||
    list(evidence.risks_considered || result.risk_playbook?.risks).length;
  const evidenceContent = hasEvidence ? <EvidenceBoard result={result} /> : null;
  const boostsContent = questions.length ? (
    <PrecisionBoosts loading={loading} onImproveWithAnswers={onImproveWithAnswers} questions={questions} />
  ) : null;

  return (
    <div className="deal-ambient min-h-screen bg-[#efe5d5] text-[#17130d]">
      <div className="ambient-noise pointer-events-none fixed inset-0 z-0" />
      <TopBar
        feedbackReceipt={feedbackReceipt}
        hasRecent={recentBids.length > 0}
        onNewBid={onNewBid}
        onSaveBid={onSaveBid}
        onShowRecent={onShowRecent}
        onSubmitFeedback={onSubmitFeedback}
        priceRange={selectedRange}
        proposal={selectedProposal}
        selectedPackage={selectedPackage}
      />

      <main className="relative z-10 mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="grid gap-5">
          <DealBriefing result={result} selectedPackage={selectedPackage} selectedRange={selectedRange} />
          <ProposalCanvas proposal={selectedProposal} result={result} selectedPackage={selectedPackage} />
        </section>

        <aside className="grid gap-4 self-start xl:sticky xl:top-28">
          <PackageSwitcher
            compact
            onSelect={setSelectedPackage}
            packageOptions={result.package_options}
            pricing={pricing}
            selectedPackage={selectedPackage}
          />
          <OpeningReplyCard proposal={selectedProposal} />
          <PackageFocusCard result={result} selectedPackage={selectedPackage} />
          <ActionPanel
            hasBoosts={Boolean(boostsContent)}
            hasEvidence={Boolean(evidenceContent)}
            onOpenPanel={setOpenPanel}
          />
          <ScopeMiniCard result={result} />
        </aside>
      </main>

      <PanelOverlay isOpen={openPanel === "evidence"} onClose={() => setOpenPanel(null)} title="Evidence Board">
        {evidenceContent}
      </PanelOverlay>
      <PanelOverlay isOpen={openPanel === "boosts"} onClose={() => setOpenPanel(null)} title="Precision Boosts">
        {boostsContent}
      </PanelOverlay>
    </div>
  );
}
