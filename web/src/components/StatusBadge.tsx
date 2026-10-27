import type { Status } from "../types";

const styles: Record<Status, string> = {
  available: "bg-emerald-50 text-emerald-800 ring-emerald-600/25",
  reserved: "bg-amber-50 text-amber-900 ring-amber-600/25",
  sold: "bg-slate-100 text-slate-700 ring-slate-500/25",
};

export const accent: Record<Status, string> = {
  available: "bg-emerald-500",
  reserved: "bg-amber-400",
  sold: "bg-slate-400",
};

interface StatusBadgeProps {
  status: Status;
}

const baseClasses = "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset";

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`${baseClasses} ${styles[status]}`}>{status}</span>
  );
}
