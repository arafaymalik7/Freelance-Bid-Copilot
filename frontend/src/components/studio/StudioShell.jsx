const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "generate", label: "Generate" },
  { id: "review", label: "Review" },
  { id: "knowledge", label: "Knowledge" },
  { id: "recent", label: "Recent" },
];

export function StudioShell({ activeView, children, hasResult, onNavigate, onNewBid }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f1e8] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-[#eadfce] bg-[#fffaf2]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <button className="text-left" onClick={() => onNavigate("home")} type="button">
            <p className="font-heading text-xl font-semibold tracking-tight text-slate-950">Bid Studio</p>
            <p className="text-xs uppercase tracking-[0.28em] text-amber-700">RAG proposal intelligence</p>
          </button>

          <nav className="flex gap-2 overflow-x-auto rounded-full bg-white/70 p-1 shadow-sm ring-1 ring-[#eadfce]">
            {NAV_ITEMS.map((item) => {
              const disabled = item.id === "review" && !hasResult;
              return (
                <button
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeView === item.id
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:bg-amber-100 hover:text-slate-950"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                  disabled={disabled}
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <button
            className="rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-300"
            onClick={onNewBid}
            type="button"
          >
            New bid
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
