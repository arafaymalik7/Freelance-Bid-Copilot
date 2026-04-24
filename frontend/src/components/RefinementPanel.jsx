import { QuestionsCard } from "./QuestionsCard.jsx";

export function RefinementPanel({
  refinementRound,
  newQuestions,
  extraction,
  onSubmitMore,
  onContinue,
  loading,
}) {
  return (
    <section className="fade-in rounded-3xl border border-navy-700 bg-navy-800 p-6 shadow-xl">
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-emerald-100">
        ✓ Round {refinementRound} complete — requirements updated
      </div>

      <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-navy-700 bg-navy-900/50 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-navy-500">Updated Deliverable</p>
            <p className="mt-2 text-lg font-semibold text-white">{extraction.main_deliverable}</p>
          </div>
          <button
            className="rounded-lg bg-accent-500 px-5 py-2.5 font-medium text-white transition hover:bg-accent-400"
            onClick={onContinue}
            type="button"
          >
            Continue to Proposal
          </button>
        </div>

        {newQuestions.length ? (
          <QuestionsCard
            gaps={{ missing_info: [], risk_flags: [], follow_up_questions: newQuestions }}
            loading={loading}
            onSkipToProposal={onContinue}
            onSubmitAnswers={onSubmitMore}
          />
        ) : (
          <div className="rounded-2xl border border-navy-700 bg-navy-800/80 p-5">
            <p className="text-white">All questions answered! Ready to generate proposal.</p>
          </div>
        )}
      </div>
    </section>
  );
}

