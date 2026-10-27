import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
}

const baseClasses =
  "cursor-pointer rounded-lg border px-3.5 py-1.5 text-sm font-medium shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50";

const primaryClasses = "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700";
const secondaryClasses = "border-slate-300 bg-white text-slate-800 hover:bg-slate-50";

export default function Button({ primary, className = "", ...rest }: ButtonProps) {
  const variantClasses = primary ? primaryClasses : secondaryClasses;
  const classes = `${baseClasses} ${variantClasses} ${className}`;

  return <button {...rest} className={classes} />;
}
