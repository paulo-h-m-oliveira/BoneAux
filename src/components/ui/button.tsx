import React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-orange-500/20 hover:orange-glow active:scale-95 bg-gradient-to-br from-orange-500 to-orange-600 transition-all",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-95 transition-all text-white",
        outline:
          "border border-primary/50 bg-background/50 backdrop-blur shadow-sm hover:bg-primary/10 hover:text-primary active:scale-95 transition-all",
        secondary:
          "bg-secondary text-secondary-foreground shadow-md shadow-yellow-500/20 hover:yellow-glow active:scale-95 bg-gradient-to-br from-yellow-400 to-yellow-500 transition-all",
        ghost: "hover:bg-primary/10 hover:text-primary active:scale-95 transition-all",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // using a simple tag instead of slot to avoid installing radix if possible, wait, I'll install class-variance-authority later or just replace this with simple concat.
    // Actually, let's just use standard React element:
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
