const STEPS = ["Brief", "Classify", "Extract", "Questions", "Refine", "Scope", "Pricing", "Proposal"];

export function StepProgress({ currentStep }) {
  return (
    <div className="mb-8 overflow-x-auto pb-2">
      <div className="flex min-w-[760px] items-start justify-between gap-2">
        {STEPS.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div className="relative flex flex-1 flex-col items-center" key={label}>
              {index > 0 ? (
                <div
                  className={`absolute left-[-50%] top-4 h-px w-full ${
                    currentStep >= index ? "bg-accent-500" : "bg-navy-700"
                  }`}
                />
              ) : null}

              <div
                className={`relative z-10 flex items-center justify-center rounded-full border ${
                  isCompleted
                    ? "h-8 w-8 border-accent-500 bg-accent-500 text-sm font-semibold text-white"
                    : isCurrent
                      ? "pulse-glow h-10 w-10 border-accent-400 bg-accent-500/15 text-white"
                      : "h-8 w-8 border-navy-600 bg-navy-800 text-navy-500"
                }`}
              >
                {isCompleted ? "✓" : index + 1}
              </div>

              <span
                className={`mt-3 text-center text-xs uppercase tracking-[0.2em] ${
                  isCurrent ? "text-accent-300" : "text-navy-500"
                } ${isCurrent ? "block" : "hidden md:block"}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

