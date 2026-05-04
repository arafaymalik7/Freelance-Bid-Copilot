import { useState } from "react";

const TABS = ["Proposal", "Pricing", "Scope", "Client Reply"];

function formatCurrencyRange(tier) {
  if (!tier) {
    return "Not available";
  }

  return `$${tier.min} - $${tier.max}`;
}

function CopyButton({ text, children }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-slate-950"
      onClick={copy}
      type="button"
    >
      {copied ? "Copied" : children}
    </button>
  );
}

function Summary({ result }) {
  const pricing = result.package.pricing;
  const scope = result.package.scope;
  const category = result.classification.category.replaceAll("_", " ");

  return (
    <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-200">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-300">Bid Summary</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold">{result.package.proposal.subject_line}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{category} - {result.classification.subcategory}</p>
        </div>
        <div className="rounded-3xl bg-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recommended</p>
          <p className="mt-2 font-mono text-2xl text-amber-200">{formatCurrencyRange(pricing.recommended)}</p>
        </div>
        <div className="rounded-3xl bg-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Timeline</p>
          <p className="mt-2 font-heading text-2xl text-white">{scope.total_estimated_days} days</p>
        </div>
        <div className="rounded-3xl bg-white/10 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Confidence</p>
          <p className="mt-2 font-heading text-2xl text-white">{result.confidence.label}</p>
          <p className="mt-1 text-sm text-slate-300">{result.confidence.score}/100</p>
        </div>
      </div>
    </section>
  );
}

function ProposalView({ proposal }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-2xl font-semibold text-slate-950">Proposal Draft</h3>
        <CopyButton text={proposal.proposal_draft}>Copy proposal</CopyButton>
      </div>
      <pre className="whitespace-pre-wrap rounded-3xl bg-slate-50 p-5 font-sans text-base leading-8 text-slate-700 ring-1 ring-slate-200">
        {proposal.proposal_draft}
      </pre>
    </div>
  );
}

function PricingView({ pricing }) {
  const tiers = [
    ["Basic", pricing.basic],
    ["Recommended", pricing.recommended],
    ["Premium", pricing.premium],
  ];

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {tiers.map(([name, tier]) => (
          <article
            className={`rounded-3xl p-5 ring-1 ${
              name === "Recommended" ? "bg-amber-50 ring-amber-200" : "bg-slate-50 ring-slate-200"
            }`}
            key={name}
          >
            <p className="font-heading text-lg font-semibold text-slate-950">{name}</p>
            <p className="mt-3 font-mono text-2xl text-slate-950">{formatCurrencyRange(tier)}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{tier.includes}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">{tier.timeline}</p>
          </article>
        ))}
      </div>
      <div className="rounded-3xl bg-white p-5 ring-1 ring-slate-200">
        <p className="font-heading font-semibold text-slate-950">What could change the price</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(pricing.what_would_increase_price || pricing.pricing_notes || []).map((note) => (
            <span className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600" key={note}>
              {note}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScopeView({ scope }) {
  return (
    <div className="grid gap-5">
      <p className="rounded-3xl bg-slate-50 p-5 text-base leading-8 text-slate-700 ring-1 ring-slate-200">
        {scope.project_summary}
      </p>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-3 font-heading font-semibold text-slate-950">Included</p>
          <div className="grid gap-2">
            {scope.in_scope.map((item) => (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 font-heading font-semibold text-slate-950">Not included</p>
          <div className="grid gap-2">
            {scope.out_of_scope.map((item) => (
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplyView({ proposal }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-heading text-2xl font-semibold text-slate-950">Short Client Reply</h3>
        <CopyButton text={proposal.client_reply}>Copy reply</CopyButton>
      </div>
      <p className="rounded-3xl bg-slate-50 p-5 text-base leading-8 text-slate-700 ring-1 ring-slate-200">
        {proposal.client_reply}
      </p>
    </div>
  );
}

function EstimateEvidence({ result }) {
  const [open, setOpen] = useState(false);
  const evidence = result.estimate_evidence || {};
  const projects = evidence.similar_projects || result.similar_projects || [];
  const pricingBasis = evidence.pricing_basis || result.package.pricing.pricing_basis || [];
  const risks = evidence.risks_considered || [];

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <button
        aria-label={open ? "Hide estimate evidence" : "Show estimate evidence"}
        className="flex w-full items-center justify-between gap-4 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>
          <span className="block font-heading font-semibold text-slate-950">Why this estimate?</span>
          <span className="mt-1 block text-sm text-slate-500">View similar projects and pricing basis.</span>
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="mt-5 grid gap-4">
          {projects.map((project) => (
            <article className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200" key={project.title}>
              <p className="font-heading font-semibold text-slate-950">{project.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{project.scope_summary}</p>
              {project.price_range ? (
                <p className="mt-2 font-mono text-sm text-amber-700">
                  Reference: ${project.price_range.low} - ${project.price_range.high}
                </p>
              ) : null}
            </article>
          ))}
          {pricingBasis.map((basis) => (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950" key={basis}>{basis}</p>
          ))}
          {risks.map((risk) => (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900" key={risk}>Risk considered: {risk}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StrategyPanel({ result }) {
  const strategy = result.bid_strategy || {};
  const assumptionStrategy = result.assumption_strategy || {};
  const items = [
    ["Positioning", strategy.positioning],
    ["Winning angle", strategy.winning_angle],
    ["Delivery approach", strategy.delivery_approach],
    ["Negotiation advice", strategy.negotiation_advice],
  ].filter(([, value]) => value);

  return (
    <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-300">AI reasoning</p>
      <h3 className="mt-2 font-heading text-xl font-semibold">Bid Strategy</h3>
      <div className="mt-5 grid gap-3">
        {items.map(([label, value]) => (
          <div className="rounded-2xl bg-white/10 p-3" key={label}>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm leading-6 text-slate-100">{value}</p>
          </div>
        ))}
      </div>
      {assumptionStrategy.summary ? (
        <p className="mt-4 rounded-2xl bg-amber-300/15 p-3 text-sm leading-6 text-amber-100">
          {assumptionStrategy.summary}
        </p>
      ) : null}
    </section>
  );
}

function AccuracyCard({ loading, onImproveWithAnswers, questions }) {
  const [answers, setAnswers] = useState({});
  const [dismissed, setDismissed] = useState(false);
  const activeQuestions = (questions || []).slice(0, 3);
  const answered = activeQuestions
    .map((question) => ({
      question: question.question,
      answer: answers[question.question]?.trim() || "",
    }))
    .filter((item) => item.answer);

  if (!activeQuestions.length || dismissed) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="font-heading font-semibold text-slate-950">Accuracy</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The bid is ready. You can copy it now or start a new brief.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="font-heading text-lg font-semibold text-slate-950">Improve accuracy</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Optional. Answer any of these {activeQuestions.length} questions to tighten the estimate.
      </p>
      <div className="mt-5 grid gap-4">
        {activeQuestions.map((question) => (
          <label className="block rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200" key={question.question}>
            <span className="font-medium text-slate-950">{question.question}</span>
            <span className="mt-1 block text-sm text-slate-500">{question.why_it_matters}</span>
            {question.answer_type === "choice" && question.choices?.length ? (
              <select
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 outline-none focus:border-amber-400"
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [question.question]: event.target.value }))
                }
                value={answers[question.question] || ""}
              >
                <option value="">Use assumption: {question.default_assumption}</option>
                {question.choices.map((choice) => (
                  <option key={choice} value={choice}>{choice}</option>
                ))}
              </select>
            ) : (
              <input
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 outline-none focus:border-amber-400"
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [question.question]: event.target.value }))
                }
                placeholder={question.default_assumption}
                value={answers[question.question] || ""}
              />
            )}
          </label>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-2xl bg-slate-950 px-4 py-3 font-heading font-semibold text-white transition hover:bg-amber-500 hover:text-slate-950 disabled:opacity-50"
          disabled={loading || answered.length === 0}
          onClick={() => onImproveWithAnswers(answered)}
          type="button"
        >
          Improve with answers
        </button>
        <button
          className="rounded-2xl border border-slate-200 px-4 py-3 font-heading font-semibold text-slate-600 transition hover:bg-slate-50"
          onClick={() => setDismissed(true)}
          type="button"
        >
          Skip questions
        </button>
      </div>
    </section>
  );
}

function FeedbackMini({ onSubmitFeedback, receipt }) {
  const submit = (rating) => {
    onSubmitFeedback({
      rating,
      labels: rating >= 4 ? ["proposal_good"] : ["too_vague"],
    });
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-heading font-semibold text-slate-950">Was this useful?</p>
          <p className="mt-1 text-sm text-slate-500">This saves a small local feedback hint.</p>
        </div>
        {receipt?.accepted ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">Saved</span>
        ) : (
          <div className="flex gap-2">
            <button className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700" onClick={() => submit(2)} type="button">
              Not yet
            </button>
            <button className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950" onClick={() => submit(5)} type="button">
              Useful
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function QuickBidResults({
  feedbackReceipt,
  loading,
  onImproveWithAnswers,
  onNewBrief,
  onSubmitFeedback,
  result,
}) {
  const [tab, setTab] = useState("Proposal");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          onClick={onNewBrief}
          type="button"
        >
          New brief
        </button>
        <p className="text-sm text-slate-500">{result.confidence.reason}</p>
      </div>

      <Summary result={result} />

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <main className="min-w-0 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
          <div className="mb-6 flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-amber-100"
                }`}
                key={item}
                onClick={() => setTab(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          {tab === "Proposal" ? <ProposalView proposal={result.package.proposal} /> : null}
          {tab === "Pricing" ? <PricingView pricing={result.package.pricing} /> : null}
          {tab === "Scope" ? <ScopeView scope={result.package.scope} /> : null}
          {tab === "Client Reply" ? <ReplyView proposal={result.package.proposal} /> : null}
        </main>

        <aside className="grid content-start gap-5">
          <StrategyPanel result={result} />
          <AccuracyCard
            loading={loading}
            onImproveWithAnswers={onImproveWithAnswers}
            questions={result.critical_questions}
          />
          <EstimateEvidence result={result} />
          <FeedbackMini feedbackReceipt={feedbackReceipt} onSubmitFeedback={onSubmitFeedback} receipt={feedbackReceipt} />
        </aside>
      </div>
    </div>
  );
}
