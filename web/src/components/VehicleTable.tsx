import type { Sort, SortKey, Vehicle } from "../types";
import Button from "./Button";
import StatusBadge from "./StatusBadge";

const th = "px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase";
const td = "px-4 py-3";
const cols: [SortKey, string][] = [
  ["make", "Make"],
  ["model", "Model"],
  ["year", "Year"],
  ["status", "Status"],
  ["version", "Version"],
];

interface Props {
  vehicles: Vehicle[];
  dealership: string;
  sort: Sort | null;
  onSort: (key: SortKey) => void;
  flashId: number | null;
  onEdit?: (vehicle: Vehicle) => void; // undefined = read-only viewer
}

function ariaSortFor(column: SortKey, sort: Sort | null) {
  if (sort?.key !== column) return undefined;
  return sort.dir === 1 ? "ascending" : "descending";
}

export default function VehicleTable({ vehicles, dealership, sort, onSort, flashId, onEdit }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Vehicles in stock at {dealership}</caption>
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            {cols.map(([key, label]) => (
              <th key={key} className={th} aria-sort={ariaSortFor(key, sort)}>
                <button
                  type="button"
                  onClick={() => onSort(key)}
                  className="group inline-flex cursor-pointer items-center gap-1 font-semibold tracking-wide uppercase hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  {label}
                  <span aria-hidden className={sort?.key === key ? "text-indigo-600" : "opacity-0 group-hover:opacity-100"}>
                    {sort?.key === key && sort.dir === -1 ? "↓" : "↑"}
                  </span>
                </button>
              </th>
            ))}
            {onEdit && <th className={`${th} text-right`}>Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id} className={`transition-[background-color] hover:bg-slate-50${flashId === vehicle.id ? "animate-flash motion-reduce:animate-none" : ""}`}>
              <td className={`${td} font-medium text-slate-900`}>{vehicle.make}</td>
              <td className={td}>{vehicle.model}</td>
              <td className={`${td} tabular-nums`}>{vehicle.year}</td>
              <td className={td}>
                <StatusBadge status={vehicle.status} />
              </td>
              <td className={`${td} text-slate-500 tabular-nums`}>{vehicle.version}</td>
              {onEdit && (
                <td className={`${td} text-right`}>
                  <Button aria-label={`Edit ${vehicle.make} ${vehicle.model}`} onClick={() => onEdit(vehicle)}>
                    Edit
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
