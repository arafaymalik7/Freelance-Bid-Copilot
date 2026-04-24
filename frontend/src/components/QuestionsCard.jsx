import { useEffect, useMemo, useState } from "react";

function SectionList({ items, icon, title, toneClass }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-900/50 p-4">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-navy-500">{title}</p>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div className={`flex items-start gap-3 text-sm ${toneClass}`} key={item}>
            <span>{icon}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderAnswerControl(question, value, setValue, index) {
  if (question.answer_type === "yes_no") {
    return (
      <div className="mt-3 flex gap-3">
        {["Yes", "No"].map((choice) => {
          const selected = value === choice;
          return (
            <button
              className={`rounded-lg px-4 py-2 text-sm transition ${
                selected ? "bg-accent-500 text-white" : "bg-navy-700 text-slate-300 hover:bg-navy-600"
              }`}
              key={choice}
              onClick={() => setValue(index, choice)}
              type="button"
            >
              {choice}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.answer_type === "number") {
    return (
      <input
        className="mt-3 w-full rounded-lg border border-navy-600 bg-navy-700 px-3 py-2 text-white outline-none transition focus:border-accent-500"
        onChange={(event) => setValue(index, event.target.value)}
        type="number"
        value={value || ""}
      />
    );
  }

  if (question.answer_type === "choice") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {question.choices?.map((choice) => {
          const selected = value === choice;
          return (
            <button
              className={`rounded-full px-4 py-2 text-sm transition ${
                selected ? "bg-accent-500 text-white" : "bg-navy-700 text-slate-300 hover:bg-navy-600"
              }`}
              key={choice}
              onClick={() => setValue(index, choice)}
              type="button"
            >
              {choice}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <input
      className="mt-3 w-full rounded-lg border border-navy-600 bg-navy-700 px-3 py-2 text-white outline-none transition focus:border-accent-500"
      onChange={(event) => setValue(index, event.target.value)}
      type="text"
      value={value || ""}
    />
  );
}

export function QuestionsCard({ gaps, onSubmitAnswers, onSkipToProposal, loading }) {
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    setAnswers({});
  }, [gaps]);

  const hasAnswers = useMemo(
    () => Object.values(answers).some((value) => String(value || "").trim().length > 0),
    [answers],
  );

  const setValue = (index, value) => {
    setAnswers((current) => ({
      ...current,
      [index]: value,
    }));
  };

  const submit = () => {
    const formattedAnswers = gaps.follow_up_questions
      .map((question, index) => ({
        question: question.question,
        answer: answers[index],
      }))
      .filter((entry) => String(entry.answer || "").trim());

    if (formattedAnswers.length) {
      onSubmitAnswers(formattedAnswers);
    }
  };

  return (
    <section className="fade-in rounded-3xl border border-navy-700 bg-navy-800 p-6 shadow-xl">
      <div className="grid gap-4 md:grid-cols-2">
        <SectionList items={gaps.missing_info} icon="⚠" title="Missing Information" toneClass="text-amber-100" />
        <SectionList items={gaps.risk_flags} icon="⛔" title="Risk Flags" toneClass="text-rose-200" />
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.28em] text-navy-500">Questions To Ask First</p>
        <div className="mt-4 space-y-5">
          {gaps.follow_up_questions.map((question, index) => (
            <div className="rounded-2xl border border-navy-700 bg-navy-900/45 p-4" key={question.question}>
              <p className="font-medium text-white">{question.question}</p>
              <p className="mt-1 text-sm italic text-slate-400">{question.why_important}</p>
              {renderAnswerControl(question, answers[index], setValue, index)}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="rounded-lg bg-accent-500 px-5 py-2.5 font-medium text-white transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasAnswers || loading}
          onClick={submit}
          type="button"
        >
          Submit Answers &amp; Refine
        </button>
        <button
          className="rounded-lg border border-navy-600 px-5 py-2.5 text-slate-300 transition hover:bg-navy-700"
          onClick={onSkipToProposal}
          type="button"
        >
          Skip to Proposal →
        </button>
      </div>
    </section>
  );
}

