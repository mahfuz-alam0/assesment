import type { Vehicle } from "../types";
import Button from "./Button";
import StatusBadge, { accent } from "./StatusBadge";

interface Props {
  vehicles: Vehicle[];
  flashId: number | null;
  onEdit?: (vehicle: Vehicle) => void; // undefined = read-only viewer
}

export default function VehicleCards({ vehicles, flashId, onEdit }: Props) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((vehicle) => (
        <li
          key={vehicle.id}
          className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition motion-safe:hover:-translate-y-0.5 hover:shadow-md ${
            flashId === vehicle.id ? "animate-flash motion-reduce:animate-none" : ""
          }`}
        >
          <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${accent[vehicle.status]}`} />
          <div className="flex items-start justify-between">
            <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-lg font-semibold text-indigo-700">
              {vehicle.make[0]}
            </span>
            <StatusBadge status={vehicle.status} />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
            {vehicle.make} {vehicle.model}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
            {vehicle.year} · version {vehicle.version}
          </p>
          {onEdit && (
            <Button className="mt-4 w-full" aria-label={`Edit ${vehicle.make} ${vehicle.model}`} onClick={() => onEdit(vehicle)}>
              Edit
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
