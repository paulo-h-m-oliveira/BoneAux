import React from "react"
import { cn } from "../../lib/utils"

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value, onChange, ...props }, ref) => {
    const val = Number(value) || 0;
    const percentage = ((val - Number(min)) / (Number(max) - Number(min))) * 100;

    return (
      <input
        type="range"
        ref={ref}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className={cn(
          "w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500",
          "focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all",
          className
        )}
        style={{
          background: `linear-gradient(to right, #f97316 0%, #eab308 ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`
        } as React.CSSProperties}
        {...props}
      />
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
