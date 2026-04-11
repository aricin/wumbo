import * as React from "react";

import { cn } from "@/lib/utils/cn";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      className={cn(
        "flex h-11 w-full rounded-2xl border border-line bg-white/90 px-4 text-sm text-ink outline-none transition-shadow placeholder:text-olive-500 focus-visible:ring-2 focus-visible:ring-olive-500/40 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);

Input.displayName = "Input";

export { Input };
