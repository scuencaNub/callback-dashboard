import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ showOutsideDays = true, ...props }: CalendarProps) {
    return (
        <DayPicker showOutsideDays={showOutsideDays} {...props} />
    )
}

Calendar.displayName = "Calendar"


