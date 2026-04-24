import { BriefInput } from "./components/BriefInput.jsx";
import { ClassificationCard } from "./components/ClassificationCard.jsx";
import { ExtractionCard } from "./components/ExtractionCard.jsx";
import { LoadingSpinner } from "./components/LoadingSpinner.jsx";
import { PricingCard } from "./components/PricingCard.jsx";
import { ProposalCard } from "./components/ProposalCard.jsx";
import { QuestionsCard } from "./components/QuestionsCard.jsx";
import { RefinementPanel } from "./components/RefinementPanel.jsx";
import { ScopeCard } from "./components/ScopeCard.jsx";
import { StepProgress } from "./components/StepProgress.jsx";
import { usePipeline } from "./hooks/usePipeline.js";

function ResultsNav({ onStartOver }) {
  const jumpTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-16 z-30 mx-auto mb-6 flex w-full max-w-6xl items-center justify-between rounded-2xl border border-navy-700 bg-navy-900/90 px-4 py-3 shadow-xl backdrop-blur">
      <div className="flex items-center gap-3 text-sm text-slate-300">
        <span className="text-navy-500">Jump to:</span>
        <button className="transition hover:text-white" onClick={() => jumpTo("scope-section")} type="button">
          Scope
        </button>
        <button className="transition hover:text-white" onClick={() => jumpTo("pricing-section")} type="button">
          Pricing
        </button>
        <button className="transition hover:text-white" onClick={() => jumpTo("proposal-section")} type="button">
          Proposal
        </button>
      </div>
      <button className="rounded-lg border border-navy-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-navy-700" onClick={onStartOver} type="button">
        Start Over
      </button>
    </div>
  );
}

function App() {
  const {
    classification,
    continueToProposal,
    error,
    extraction,
    gaps,
    loading,
    loadingMessage,
    pricing,
    profileStepLabel,
    proposal,
    refinementRound,
    resetPipeline,
    runFullPipeline,
    scope,
    step,
    submitRefinement,
  } = usePipeline();

  const currentStepLabel = profileStepLabel || (step === 0 ? "Brief" : "Proposal");

  return (
    <div className="min-h-screen bg-navy-900 text-slate-300">
      <header className="sticky top-0 z-40 border-b border-navy-700 bg-navy-900/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <div>
            <p className="font-heading text-lg font-semibold text-white">🚀 Bid Copilot</p>
            <p className="text-xs uppercase tracking-[0.28em] text-navy-500">{currentStepLabel}</p>
          </div>
          <p className="text-sm text-slate-400">Step {step === 0 ? 1 : step} of 7</p>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col px-4 py-6 md:px-6">
        {step > 0 ? <StepProgress currentStep={step} /> : null}

        {step === 7 && !loading ? <ResultsNav onStartOver={resetPipeline} /> : null}

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-heading text-base font-semibold text-white">Something blocked the pipeline</p>
                <p className="mt-1 text-sm text-red-100">{error.message}</p>
              </div>
              <div className="flex gap-3">
                <button
                  className="rounded-lg bg-accent-500 px-5 py-2.5 font-medium text-white transition hover:bg-accent-400"
                  onClick={() => error.retryFn?.()}
                  type="button"
                >
                  Try Again
                </button>
                <button
                  className="rounded-lg border border-navy-600 px-5 py-2.5 text-slate-300 transition hover:bg-navy-700"
                  onClick={resetPipeline}
                  type="button"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 0 ? (
          <BriefInput loading={loading} onSubmit={runFullPipeline} />
        ) : null}

        {step >= 3 && step < 7 && classification && extraction && gaps ? (
          <section className="flex flex-col gap-6">
            <ClassificationCard classification={classification} />
            <ExtractionCard extraction={extraction} />
            {refinementRound > 0 ? (
              <RefinementPanel
                extraction={extraction}
                loading={loading}
                newQuestions={gaps.follow_up_questions}
                onContinue={continueToProposal}
                onSubmitMore={submitRefinement}
                refinementRound={refinementRound}
              />
            ) : (
              <QuestionsCard
                gaps={gaps}
                loading={loading}
                onSkipToProposal={continueToProposal}
                onSubmitAnswers={submitRefinement}
              />
            )}
          </section>
        ) : null}

        {step === 7 && scope && pricing && proposal && classification && extraction ? (
          <section className="flex flex-col gap-6">
            <ScopeCard id="scope-section" scope={scope} />
            <PricingCard id="pricing-section" pricing={pricing} />
            <ProposalCard
              category={classification.category}
              onStartOver={resetPipeline}
              projectSize={extraction.project_size}
              proposal={proposal}
              recommendedRange={[pricing.recommended.min, pricing.recommended.max]}
              sectionId="proposal-section"
              totalEstimatedDays={scope.total_estimated_days}
            />
          </section>
        ) : null}
      </main>

      <footer className="border-t border-navy-800 px-4 py-5 text-center text-sm text-navy-500">
        Built with Gemini AI
      </footer>

      {loading ? <LoadingSpinner message={loadingMessage} /> : null}
    </div>
  );
}

export default App;
