import * as React from "react"
import { cn } from "../../lib/utils"

const Slider = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        min?: number
        max?: number
        step?: number
        value?: number[]
        onValueChange?: (value: number[]) => void
    }
>(({ className, min = 0, max = 100, step = 1, value = [0], onValueChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value)
        onValueChange?.([newValue])
    }

    return (
        <div ref={ref} className={cn("relative flex w-full touch-none select-none items-center", className)} {...props}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value[0]}
                onChange={handleChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
        </div>
    )
})
Slider.displayName = "Slider"

export { Slider }
