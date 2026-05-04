import { useState } from "react";

const LABELS = [
  ["proposal_good", "Proposal good"],
  ["too_expensive", "Too expensive"],
  ["too_cheap", "Too cheap"],
  ["too_vague", "Too vague"],
  ["missing_details", "Missing details"],
  ["tone_not_good", "Tone issue"],
];

export function FeedbackPanel({ loading, onSubmitFeedback, receipt }) {
  const [rating, setRating] = useState(5);
  const [labels, setLabels] = useState(["proposal_good"]);
  const [comment, setComment] = useState("");

  const toggleLabel = (label) => {
    setLabels((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmitFeedback({ rating, labels, comment });
  };

  return (
    <section className="rounded-[1.5rem] border border-navy-700 bg-navy-900/75 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-white">Feedback Learning</h2>
          <p className="mt-1 text-sm text-slate-400">
            This stores bounded JSON hints only. It is not model training.
          </p>
        </div>
        {receipt?.accepted ? (
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">Saved</span>
        ) : null}
      </div>

      <form className="mt-5 grid gap-4" onSubmit={submit}>
        <label className="text-sm text-slate-300">
          Rating
          <input
            className="mt-2 w-full accent-accent-500"
            max="5"
            min="1"
            onChange={(event) => setRating(Number(event.target.value))}
            type="range"
            value={rating}
          />
          <span className="font-mono text-accent-300">{rating}/5</span>
        </label>

        <div className="flex flex-wrap gap-2">
          {LABELS.map(([value, label]) => (
            <button
              className={`rounded-full border px-3 py-2 text-sm transition ${
                labels.includes(value)
                  ? "border-accent-400 bg-accent-500/15 text-accent-300"
                  : "border-navy-700 text-slate-400 hover:text-white"
              }`}
              key={value}
              onClick={() => toggleLabel(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          className="min-h-24 rounded-2xl border border-navy-700 bg-navy-950/70 p-3 text-white outline-none focus:border-accent-400"
          onChange={(event) => setComment(event.target.value)}
          placeholder="Optional note for future generation hints"
          value={comment}
        />

        <button
          className="rounded-2xl border border-accent-400/50 px-5 py-3 font-heading font-semibold text-accent-300 transition hover:bg-accent-500/10 disabled:opacity-50"
          disabled={loading}
          type="submit"
        >
          Submit Feedback
        </button>
      </form>
    </section>
  );
}
