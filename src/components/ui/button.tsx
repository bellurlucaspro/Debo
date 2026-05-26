import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Bouton DEBO — sobre, micro-bordures, transitions lentes "galerie".
 * Variante `luxe` : pleine teinte Obsidian avec halo au survol.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-medium uppercase tracking-luxe transition-all duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primaire — ruby plein, présence forte
        luxe: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_10px_44px_-12px_hsl(var(--primary)/0.6)]",
        // Secondaire — contour franc, s'inverse au survol
        secondary:
          "border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
        outline:
          "border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
        ghost: "bg-transparent hover:bg-foreground/5 text-foreground",
        link: "text-foreground underline-offset-4 hover:underline tracking-normal normal-case",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        sm: "h-9 px-4 text-[11px]",
        default: "h-11 px-7",
        lg: "h-14 px-10 text-[13px]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "luxe",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
