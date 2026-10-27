import { STATUSES, type Status, type Vehicle } from "../types";
import StatusBadge from "./StatusBadge";

export type Filter = Status | "all";
const tabs: Filter[] = ["all", ...STATUSES];

interface StatTabsProps {
  vehicles: Vehicle[];
  value: Filter;
  onChange: (filter: Filter) => void;
}

// Count cards double as status filters.
export default function StatTabs({ vehicles, value, onChange }: StatTabsProps) {
  const countFor = (tab: Filter) => tab === "all" ? vehicles.length : vehicles.filter((vehicle) => vehicle.status === tab).length;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          aria-pressed={value === tab}
          onClick={() => onChange(tab)}
          className={`cursor-pointer rounded-xl border bg-white p-4 text-left shadow-sm transition motion-safe:hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
            value === tab ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-slate-200"
          }`}
        >
          <span className="block text-sm text-slate-500">{tab === "all" ? "Total" : <StatusBadge status={tab} />}</span>
          <span className="mt-2 block text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{countFor(tab)}</span>
        </button>
      ))}
    </div>
  );
}
