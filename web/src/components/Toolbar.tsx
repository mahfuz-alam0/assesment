import { controlClass } from "./Field";

export type View = "table" | "cards";

interface Props {
  query: string;
  onQuery: (query: string) => void;
  view: View;
  onView: (view: View) => void;
  shown: number;
  total: number;
}

const views: View[] = ["table", "cards"];

export default function Toolbar({ query, onQuery, view, onView, shown, total }: Props) {
  
  const countLabel = shown === total ? `${total} vehicles` : `${shown} of ${total} vehicles`;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative min-w-52 flex-1">
        <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        {/* aria-label is "Search" on purpose: getByLabel("Model") in e2e is a substring match. */}
        <input type="search" aria-label="Search" placeholder="Search make or model…" value={query} onChange={(e) => onQuery(e.target.value)} className={`${controlClass} w-full pl-9`} />
      </div>
      <span role="status" className="text-sm text-slate-500 tabular-nums">
        {countLabel}
      </span>
      <div role="group" aria-label="Layout" className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm">
        {views.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={view === mode}
            onClick={() => onView(mode)}
            className={`cursor-pointer rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 ${
              view === mode ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}
