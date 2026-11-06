import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-brand text-[#07110c] hover:bg-[#5bd493]",
        variant === "secondary" && "border border-border bg-white/[0.035] text-foreground hover:bg-white/[0.07]",
        variant === "ghost" && "text-muted hover:bg-white/5 hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
