import { useState } from "react";

function CopyButton({ copied, label, onCopy }) {
  return (
    <button
      className="rounded-lg border border-navy-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-navy-700"
      onClick={onCopy}
      type="button"
    >
      {copied ? "✓ Copied!" : label}
    </button>
  );
}

export function ProposalCard({
  proposal,
  category,
  projectSize,
  totalEstimatedDays,
  recommendedRange,
  onStartOver,
  sectionId,
}) {
  const [activeTab, setActiveTab] = useState("proposal");
  const [copiedTarget, setCopiedTarget] = useState("");

  const writeToClipboard = async (target, value) => {
    if (!navigator?.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedTarget(target);
    window.setTimeout(() => setCopiedTarget(""), 2000);
  };

  const proposalText = proposal.proposal_draft;
  const clientReply = proposal.client_reply;

  return (
    <section className="fade-in rounded-3xl border border-navy-700 bg-navy-800 p-6 shadow-xl" id={sectionId}>
      <div className="flex flex-wrap gap-3 rounded-2xl border border-navy-700 bg-navy-900/55 px-4 py-3 text-sm text-slate-300">
        <span className="rounded-full bg-navy-700 px-3 py-1 capitalize">{category.replaceAll("_", " ")}</span>
        <span className="rounded-full bg-navy-700 px-3 py-1 capitalize">{projectSize}</span>
        <span className="rounded-full bg-navy-700 px-3 py-1">{totalEstimatedDays} days</span>
        <span className="rounded-full bg-accent-500/20 px-3 py-1 text-accent-200">
          ${recommendedRange[0]}–${recommendedRange[1]}
        </span>
      </div>

      <div className="mt-6 flex gap-6 border-b border-navy-700">
        <button
          className={`border-b-2 pb-3 text-sm font-medium transition ${
            activeTab === "proposal" ? "border-accent-500 text-white" : "border-transparent text-slate-400"
          }`}
          onClick={() => setActiveTab("proposal")}
          type="button"
        >
          📄 Proposal Draft
        </button>
        <button
          className={`border-b-2 pb-3 text-sm font-medium transition ${
            activeTab === "reply" ? "border-accent-500 text-white" : "border-transparent text-slate-400"
          }`}
          onClick={() => setActiveTab("reply")}
          type="button"
        >
          💬 Client Reply
        </button>
      </div>

      {activeTab === "proposal" ? (
        <div className="mt-5">
          <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-navy-700 bg-navy-900/45 p-4 md:flex-row md:items-center md:justify-between">
            <p className="font-mono text-sm text-slate-200">Subject: {proposal.subject_line}</p>
            <CopyButton
              copied={copiedTarget === "subject"}
              label="Copy Subject"
              onCopy={() => writeToClipboard("subject", proposal.subject_line)}
            />
          </div>

          <div className="flex justify-end">
            <CopyButton
              copied={copiedTarget === "proposal"}
              label="Copy to Clipboard"
              onCopy={() => writeToClipboard("proposal", proposalText)}
            />
          </div>
          <textarea
            className="mt-3 min-h-72 w-full rounded-2xl bg-navy-700 p-4 font-mono text-sm text-slate-200 outline-none"
            readOnly
            value={proposalText}
          />
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex justify-end">
            <CopyButton
              copied={copiedTarget === "reply"}
              label="Copy to Clipboard"
              onCopy={() => writeToClipboard("reply", clientReply)}
            />
          </div>
          <textarea
            className="mt-3 min-h-56 w-full rounded-2xl bg-navy-700 p-4 font-mono text-sm text-slate-200 outline-none"
            readOnly
            value={clientReply}
          />
        </div>
      )}

      <button
        className="mt-6 rounded-lg border border-navy-600 px-5 py-2.5 text-slate-300 transition hover:bg-navy-700"
        onClick={onStartOver}
        type="button"
      >
        🔄 Start New Brief
      </button>
    </section>
  );
}

