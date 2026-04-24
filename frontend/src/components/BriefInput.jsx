import { useMemo, useState } from "react";

const SAMPLE_BRIEFS = {
  website:
    "Hi, I need a website for my clothing boutique. I want to sell products online, maybe 30-40 items. The design should be elegant and modern. I also want customers to be able to create accounts and track their orders. Can you tell me the price and how long it will take?",
  mobile:
    "I want to build an app for tracking personal finances. Users should be able to add income and expenses, see charts of their spending, and get alerts when they are close to their budget. iOS first, maybe Android later.",
  content:
    "I need help with blog content for my digital marketing agency. Looking for 8 articles per month, around 1000 words each, on topics like SEO, social media, and email marketing. They need to be SEO optimized and sound professional.",
};

export function BriefInput({ onSubmit, loading }) {
  const [draft, setDraft] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  const trimmedLength = draft.trim().length;
  const wordCount = useMemo(() => {
    const words = draft.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [draft]);

  const charCountClass =
    trimmedLength < 30 ? "text-red-300" : trimmedLength <= 100 ? "text-amber-300" : "text-emerald-300";

  const handleSubmit = () => {
    const normalized = draft.trim();
    if (normalized.length < 20) {
      setValidationMessage("Please add more detail for accurate results — at least 2-3 sentences work best");
      return;
    }

    setValidationMessage("");
    onSubmit(normalized);
  };

  const fillSample = (value) => {
    setDraft(value);
    setValidationMessage("");
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-2xl">
      <div className="fade-in rounded-3xl border border-navy-700 bg-navy-800 p-6 shadow-xl md:p-8">
        <h1 className="font-heading text-3xl font-bold text-white">Paste Your Client Brief</h1>
        <p className="mt-2 text-slate-400">Paste any message, email or project description from a client</p>

        <textarea
          className="mt-6 min-h-48 w-full rounded-2xl border border-navy-600 bg-navy-700 p-4 text-white outline-none transition placeholder:text-navy-500 focus:border-accent-500"
          onChange={(event) => {
            setDraft(event.target.value);
            if (validationMessage) {
              setValidationMessage("");
            }
          }}
          placeholder="e.g. Hi, I need a website for my restaurant. Can you share your price and timeline? I want it to look modern with an online menu..."
          value={draft}
        />

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className={charCountClass}>{trimmedLength} characters</span>
          <span className="text-slate-400">{wordCount} words</span>
        </div>

        {validationMessage ? <p className="mt-3 text-sm text-red-300">{validationMessage}</p> : null}

        <button
          className="mt-4 w-full rounded-lg bg-accent-500 px-5 py-3 font-medium text-white transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={trimmedLength < 20 || loading}
          onClick={handleSubmit}
          type="button"
        >
          Analyze Brief
        </button>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full border border-navy-600 bg-navy-700 px-4 py-2 text-sm text-slate-300 transition hover:border-accent-400 hover:text-white"
            onClick={() => fillSample(SAMPLE_BRIEFS.website)}
            type="button"
          >
            🌐 Website
          </button>
          <button
            className="rounded-full border border-navy-600 bg-navy-700 px-4 py-2 text-sm text-slate-300 transition hover:border-accent-400 hover:text-white"
            onClick={() => fillSample(SAMPLE_BRIEFS.mobile)}
            type="button"
          >
            📱 Mobile App
          </button>
          <button
            className="rounded-full border border-navy-600 bg-navy-700 px-4 py-2 text-sm text-slate-300 transition hover:border-accent-400 hover:text-white"
            onClick={() => fillSample(SAMPLE_BRIEFS.content)}
            type="button"
          >
            ✍️ Content Writing
          </button>
        </div>
      </div>
    </div>
  );
}

