import * as React from "react";

import { cn } from "@/lib/utils/cn";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn(
        "rounded-[28px] border border-line/70 bg-surface/90 shadow-[0_24px_60px_rgba(18,34,29,0.10)] backdrop-blur-xl",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);

Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn("flex flex-col gap-2 p-6 sm:p-7", className)} ref={ref} {...props} />
  ),
);

CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 className={cn("text-lg font-semibold tracking-tight text-ink", className)} ref={ref} {...props} />
  ),
);

CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p className={cn("text-sm leading-6 text-olive-700", className)} ref={ref} {...props} />
  ),
);

CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className={cn("px-6 pb-6 sm:px-7 sm:pb-7", className)} ref={ref} {...props} />
  ),
);

CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn("flex items-center gap-3 px-6 pb-6 sm:px-7 sm:pb-7", className)}
      ref={ref}
      {...props}
    />
  ),
);

CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
