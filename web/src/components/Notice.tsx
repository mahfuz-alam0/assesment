import type { ReactNode } from "react";

export type Kind = "error" | "success" | "info";

const styles: Record<Kind, string> = {
  error: "border-red-200 bg-red-50 text-red-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  info: "border-indigo-200 bg-indigo-50 text-indigo-900",
};

interface NoticeProps {
  kind: Kind;
  children: ReactNode;
}

export default function Notice({ kind, children }: NoticeProps) {
  const role = kind === "error" ? "alert" : "status";

  return (
    <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${styles[kind]}`} role={role}>
      {children}
    </div>
  );
}
