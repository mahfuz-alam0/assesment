interface LogoProps {
  className?: string;
}

const baseClasses =
  "inline-flex items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-sm";

export default function Logo({ className = "size-9" }: LogoProps) {
  return (
    <span aria-hidden className={`${baseClasses} ${className}`}>
      <svg viewBox="0 0 32 32" className="size-3/5" fill="currentColor">
        <path d="M5 19l2-6h18l2 6v5h-3v-2H8v2H5zm5-4h12l-1-3H11z" />
      </svg>
    </span>
  );
}
