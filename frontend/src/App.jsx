import { useState } from "react";
import { LoadingSpinner } from "./components/LoadingSpinner.jsx";
import { BriefInbox } from "./components/deal/BriefInbox.jsx";
import { DealRoom } from "./components/deal/DealRoom.jsx";
import { useQuickBid } from "./hooks/useQuickBid.js";

function ErrorBanner({ error }) {
  if (!error) {
    return null;
  }

  return (
    <div className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-3xl rounded-3xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-2xl shadow-red-950/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading font-semibold">Something needs attention</p>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
        <button
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          onClick={() => error.retryFn?.()}
          type="button"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function RecentBidsOverlay({ isOpen, onClose, onOpenRecent, recentBids = [] }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#17130d]/45 p-3 backdrop-blur-sm md:p-6" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" onClick={onClose} type="button" aria-label="Close recent bids backdrop" />
      <aside className="relative ml-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-[2rem] border border-[#d8c8ae] bg-[#fffdf8] shadow-2xl shadow-[#17130d]/30">
        <header className="flex items-center justify-between gap-4 border-b border-[#eee2cf] px-5 py-4">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-amber-800">Saved locally</p>
            <h2 className="font-heading text-2xl font-semibold text-[#17130d]">Recent bids</h2>
          </div>
          <button className="rounded-full bg-[#17130d] px-4 py-2 text-xs font-bold text-white hover:bg-amber-400 hover:text-[#17130d]" onClick={onClose} type="button">
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {recentBids.length ? (
            <div className="grid gap-3">
              {recentBids.slice(0, 10).map((bid) => (
                <button
                  className="rounded-2xl border border-[#eee2cf] bg-[#fbf7ef] p-4 text-left transition hover:border-amber-300 hover:bg-white"
                  key={bid.id}
                  onClick={() => {
                    onOpenRecent(bid);
                    onClose();
                  }}
                  type="button"
                >
                  <p className="font-heading text-sm font-semibold leading-5 text-[#17130d]">{bid.title}</p>
                  {bid.category ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{bid.category.replaceAll("_", " ")}</p>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-[#fbf7ef] p-4 text-sm leading-6 text-slate-600">No bids saved yet.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function App() {
  const bid = useQuickBid();
  const [recentOpen, setRecentOpen] = useState(false);

  const generateDeal = async (brief, preferences) => {
    await bid.generateBid(brief, preferences);
  };

  const openRecentBid = (savedBid) => {
    bid.loadRecentBid(savedBid);
  };

  return (
    <>
      <ErrorBanner error={bid.error} />

      {bid.result ? (
        <DealRoom
          feedbackReceipt={bid.feedbackReceipt}
          loading={bid.loading}
          onImproveWithAnswers={bid.improveWithAnswers}
          onNewBid={bid.reset}
          onSaveBid={bid.saveCurrentBid}
          onShowRecent={() => setRecentOpen(true)}
          onSubmitFeedback={bid.submitFeedback}
          recentBids={bid.recentBids}
          result={bid.result}
        />
      ) : (
        <BriefInbox
          loading={bid.loading}
          onGenerate={generateDeal}
          onShowRecent={() => setRecentOpen(true)}
          recentBids={bid.recentBids}
        />
      )}

      <RecentBidsOverlay
        isOpen={recentOpen}
        onClose={() => setRecentOpen(false)}
        onOpenRecent={openRecentBid}
        recentBids={bid.recentBids}
      />

      {bid.loading ? <LoadingSpinner message={bid.loadingMessage} /> : null}
    </>
  );
}

export default App;
