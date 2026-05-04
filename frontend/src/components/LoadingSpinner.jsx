export function LoadingSpinner({ message }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17130d]/55 p-4 backdrop-blur-md">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#fffdf8] px-8 py-10 text-center shadow-2xl shadow-[#17130d]/35">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-300/30 blur-2xl" />
        <div className="absolute -bottom-12 left-4 h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="relative mx-auto h-16 w-16 rounded-full border border-[#eadbc4] bg-white p-2">
          <div className="h-full w-full animate-spin rounded-full border-4 border-amber-100 border-t-[#17130d]" />
        </div>
        <p className="relative mt-5 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-amber-700">Building deal room</p>
        <p className="relative mt-3 max-w-xs text-sm leading-6 text-slate-600">{message}</p>
      </div>
    </div>
  );
}
