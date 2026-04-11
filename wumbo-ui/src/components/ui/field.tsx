import * as React from "react";

import { cn } from "@/lib/utils/cn";

const Field = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div className={cn("grid gap-2", className)} ref={ref} {...props} />,
);

Field.displayName = "Field";

const FieldDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p className={cn("text-sm leading-6 text-olive-700", className)} ref={ref} {...props} />
  ),
);

FieldDescription.displayName = "FieldDescription";

export { Field, FieldDescription };
