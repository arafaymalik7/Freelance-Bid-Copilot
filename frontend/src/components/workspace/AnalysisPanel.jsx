import { useState } from "react";

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-950/50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 font-heading text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function PillList({ items }) {
  if (!items?.length) {
    return <p className="text-sm text-slate-500">No items detected.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span className="rounded-full border border-navy-700 bg-navy-950/70 px-3 py-1 text-xs text-slate-300" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <section className="rounded-[1.5rem] border border-navy-700 bg-navy-900/75 p-5">
      <h2 className="font-heading text-xl font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SimilarProjectCard({ project }) {
  const price = project.price_range
    ? `$${project.price_range.low} - $${project.price_range.high}`
    : "Reference price unavailable";

  return (
    <article className="rounded-2xl border border-navy-700 bg-navy-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading font-semibold text-white">{project.title}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{project.subcategory}</p>
        </div>
        <span className="rounded-full bg-accent-500/15 px-3 py-1 text-xs text-accent-300">
          {(project.similarity * 100).toFixed(0)}% match
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{project.scope_summary}</p>
      <p className="mt-3 font-mono text-sm text-accent-300">{price}</p>
      <PillList items={project.risk_flags?.slice(0, 3)} />
    </article>
  );
}

function QuestionForm({ questions, loading, onSubmitClarifications }) {
  const [answers, setAnswers] = useState({});
  const answeredCount = Object.values(answers).filter((value) => value?.trim()).length;

  const submit = (event) => {
    event.preventDefault();
    const formattedAnswers = questions
      .map((question) => ({
        question: question.question,
        answer: answers[question.question]?.trim() || "",
      }))
      .filter((answer) => answer.answer);

    onSubmitClarifications(formattedAnswers);
  };

  if (!questions?.length) {
    return <p className="text-sm text-emerald-200">No blocking questions remain.</p>;
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      {questions.map((question) => (
        <label className="block rounded-2xl border border-navy-700 bg-navy-950/60 p-4" key={question.question}>
          <span className="font-heading font-semibold text-white">{question.question}</span>
          <span className="mt-1 block text-sm leading-6 text-slate-400">{question.why_important}</span>
          {question.answer_type === "choice" && question.choices?.length ? (
            <select
              className="mt-3 w-full rounded-xl border border-navy-700 bg-navy-900 p-3 text-white outline-none focus:border-accent-400"
              onChange={(event) =>
                setAnswers((current) => ({ ...current, [question.question]: event.target.value }))
              }
              value={answers[question.question] || ""}
            >
              <option value="">Select an answer</option>
              {question.choices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="mt-3 w-full rounded-xl border border-navy-700 bg-navy-900 p-3 text-white outline-none focus:border-accent-400"
              onChange={(event) =>
                setAnswers((current) => ({ ...current, [question.question]: event.target.value }))
              }
              placeholder="Type the client answer"
              value={answers[question.question] || ""}
            />
          )}
        </label>
      ))}

      <button
        className="rounded-2xl bg-accent-500 px-5 py-3 font-heading font-semibold text-navy-950 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading || answeredCount === 0}
        type="submit"
      >
        Refine With {answeredCount || "No"} Answer{answeredCount === 1 ? "" : "s"}
      </button>
    </form>
  );
}

export function AnalysisPanel({ loading, onGeneratePackage, onSubmitClarifications, workspace }) {
  const classification = workspace?.classification;
  const extraction = workspace?.extraction;
  const gaps = workspace?.gaps;
  const readiness = workspace?.readiness;
  const similarProjects = workspace?.similar_projects || [];
  const sourceIds = workspace?.ragContext?.source_ids || [];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Confidence" value={`${Math.round((classification?.confidence || 0) * 100)}%`} />
        <StatCard label="Complexity" value={classification?.complexity_signal || "medium"} />
        <StatCard label="Size" value={extraction?.project_size || "pending"} />
        <StatCard label="Readiness" value={`${readiness?.score ?? 0}/100`} />
      </div>

      <SectionCard title="Brief Understanding">
        <p className="text-base leading-7 text-slate-300">{extraction?.main_deliverable}</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold text-white">Detected Features</p>
            <PillList items={extraction?.features} />
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-white">Technical Requirements</p>
            <PillList items={extraction?.technical_requirements} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Similar Projects">
        {similarProjects.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {similarProjects.slice(0, 4).map((project) => (
              <SimilarProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No similar projects returned yet.</p>
        )}
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <SectionCard title="Questions And Risks">
          <div className="grid gap-5">
            <div>
              <p className="mb-3 text-sm font-semibold text-white">Missing Info</p>
              <PillList items={gaps?.missing_info} />
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-white">Risk Flags</p>
              <PillList items={gaps?.risk_flags} />
            </div>
            <QuestionForm
              loading={loading}
              onSubmitClarifications={onSubmitClarifications}
              questions={gaps?.follow_up_questions || []}
            />
          </div>
        </SectionCard>

        <SectionCard title="RAG Sources">
          <div className="flex flex-wrap gap-2">
            {sourceIds.map((sourceId) => (
              <span className="rounded-xl bg-navy-950 px-3 py-2 font-mono text-xs text-slate-300" key={sourceId}>
                {sourceId}
              </span>
            ))}
          </div>
          <button
            className="mt-5 w-full rounded-2xl border border-accent-400/50 px-5 py-3 font-heading font-semibold text-accent-300 transition hover:bg-accent-500/10 disabled:opacity-50"
            disabled={loading || !readiness?.can_generate}
            onClick={onGeneratePackage}
            type="button"
          >
            Generate Bid Package
          </button>
          {!readiness?.can_generate ? (
            <p className="mt-3 text-sm text-amber-200">Answer at least one clarification before package generation.</p>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
}
