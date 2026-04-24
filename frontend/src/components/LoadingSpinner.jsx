export function LoadingSpinner({ message }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/80 backdrop-blur-sm">
      <div className="flex flex-col items-center rounded-3xl border border-navy-700 bg-navy-800/90 px-8 py-10 shadow-2xl">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-navy-600 border-t-accent-500" />
        <p className="mt-4 text-sm text-slate-400">{message}</p>
      </div>
    </div>
  );
}

