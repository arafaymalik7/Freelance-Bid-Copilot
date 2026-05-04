import { QuickBidResults } from "../components/quick/QuickBidResults.jsx";

export function ReviewView({
  feedbackReceipt,
  loading,
  onImproveWithAnswers,
  onNewBrief,
  onStart,
  onSubmitFeedback,
  result,
}) {
  if (!result) {
    return (
      <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-[#eadfce]">
        <p className="font-heading text-2xl font-semibold text-slate-950">No bid generated yet</p>
        <p className="mt-2 text-slate-600">Start with a brief to open the review workspace.</p>
        <button
          className="mt-5 rounded-full bg-slate-950 px-5 py-2.5 font-semibold text-white"
          onClick={onStart}
          type="button"
        >
          Go to Generate
        </button>
      </section>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#eadfce]">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-amber-700">Review workspace</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-heading text-4xl font-semibold text-slate-950">Bid command center</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Review the generated package, inspect reasoning, improve accuracy, and copy the parts you need.
            </p>
          </div>
          <div className="rounded-2xl bg-[#fbf6ed] px-4 py-3 text-sm text-slate-700 ring-1 ring-[#eadfce]">
            Confidence: <span className="font-semibold text-slate-950">{result.confidence?.label}</span>
          </div>
        </div>
      </section>

      <QuickBidResults
        feedbackReceipt={feedbackReceipt}
        loading={loading}
        onImproveWithAnswers={onImproveWithAnswers}
        onNewBrief={onNewBrief}
        onSubmitFeedback={onSubmitFeedback}
        result={result}
      />
    </div>
  );
}
