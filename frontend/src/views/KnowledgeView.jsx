import { useState } from "react";
import { searchKnowledge } from "../api/client.js";

export function KnowledgeView({ result }) {
  const [query, setQuery] = useState("ecommerce checkout pricing");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const evidence = result?.estimate_evidence;

  const runSearch = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await searchKnowledge({
        query,
        category: result?.classification?.category,
        topK: 6,
      });
      setResults(response.results || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-[#eadfce]">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-amber-700">Knowledge</p>
        <h1 className="mt-2 font-heading text-4xl font-semibold text-slate-950">RAG evidence explorer</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Search the local knowledge base used by the bid generator. Results are translated into project evidence, not raw vector records.
        </p>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={runSearch}>
          <input
            className="min-w-0 flex-1 rounded-2xl border border-[#eadfce] bg-[#fbf6ed] px-4 py-3 text-slate-950 outline-none focus:border-amber-400"
            onChange={(event) => setQuery(event.target.value)}
            value={query}
          />
          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 font-heading font-semibold text-white disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? "Searching..." : "Search knowledge"}
          </button>
        </form>
      </section>

      {evidence ? (
        <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm">
          <p className="font-heading text-2xl font-semibold">Evidence from current bid</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {(evidence.similar_projects || []).map((project) => (
              <article className="rounded-3xl bg-white/10 p-4" key={project.title}>
                <p className="font-heading font-semibold">{project.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{project.scope_summary}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {results.map((item) => (
          <article className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-[#eadfce]" key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-heading text-lg font-semibold text-slate-950">{item.title}</p>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                {(item.similarity * 100).toFixed(0)}% match
              </span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              {item.type?.replaceAll("_", " ")} · {item.category?.replaceAll("_", " ")}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {item.metadata?.scope_summary || item.metadata?.rule || item.metadata?.guideline || item.metadata?.risk || "Knowledge record used for retrieval."}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
