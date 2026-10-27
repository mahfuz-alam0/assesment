import type { ReactNode } from "react";

export const controlClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 aria-invalid:border-red-600";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

// The control gets aria-describedby="<id>-error" from the caller when `error` is set.
export default function Field({ id, label, error, children }: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <span id={errorId} className="text-sm text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
