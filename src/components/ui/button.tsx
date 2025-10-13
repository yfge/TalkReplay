import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = {
  default:
    "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-primary-foreground shadow-sm hover:from-[hsl(var(--primary))]/90 hover:to-[hsl(var(--secondary))]/90",
  secondary:
    "border border-secondary/40 bg-secondary/90 text-secondary-foreground shadow-sm hover:bg-secondary",
  ghost: "hover:bg-accent/20 hover:text-accent-foreground focus-visible:ring-0",
  outline:
    "border border-input bg-background/80 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
} as const;

type Variant = keyof typeof buttonVariants;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: Variant;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", asChild = false, ...props },
  ref,
) {
  const classNames = cn(
    "inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    buttonVariants[variant],
    className,
  );

  if (asChild) {
    return <Slot className={classNames} ref={ref} {...props} />;
  }

  return <button className={classNames} ref={ref} {...props} />;
});

Button.displayName = "Button";

export { Button };
