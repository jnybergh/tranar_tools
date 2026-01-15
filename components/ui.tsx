import * as React from "react";

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/5",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition border focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-white/10 hover:bg-white/15 border-white/10"
      : variant === "secondary"
      ? "bg-transparent hover:bg-white/10 border-white/10 text-slate-200"
      : "bg-red-500/15 hover:bg-red-500/25 border-red-400/20 text-red-100";
  return <button className={cn(base, styles, className)} {...props} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20",
        props.className
      )}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  sublabel
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {sublabel ? <span className="block text-xs text-slate-400">{sublabel}</span> : null}
      </span>
      <input
        type="checkbox"
        className="h-5 w-5 accent-white/80"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
