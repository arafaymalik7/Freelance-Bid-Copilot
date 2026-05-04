import { QuickBidIntake } from "../components/quick/QuickBidIntake.jsx";

export function GenerateView({ loading, onGenerate }) {
  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#eadfce]">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-amber-700">Generate</p>
        <h1 className="mt-2 font-heading text-4xl font-semibold text-slate-950">Create a bid package</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Paste the client brief. Bid Studio will classify the project, retrieve local RAG evidence, estimate scope and pricing, and generate a proposal package.
        </p>
      </section>
      <QuickBidIntake loading={loading} onGenerate={onGenerate} />
    </div>
  );
}
