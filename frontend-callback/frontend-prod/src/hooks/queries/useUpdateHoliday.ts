import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"
import type { Holiday } from "./useGetHolidays"

export interface UpdateHolidayPayload {
    name?: string
    description?: string
    configuration_type?: "Completely disable callbacks" | "Only allow scheduled callbacks" | "Partial operation"
    queue_overrides?: Record<string, {
        enabled?: boolean
        start_time_asap?: string
        stop_time_asap?: string
    }>
}

const updateHoliday = async (date: string, payload: UpdateHolidayPayload): Promise<Holiday> => {
    const idToken = await getIdToken()

    const response = await fetch(`${config.updateHolidayCalendarUrl}/${date}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update holiday' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
}

export function useUpdateHoliday() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ date, payload }: { date: string; payload: UpdateHolidayPayload }) => updateHoliday(date, payload),
        onSuccess: () => {
            // Invalidate and refetch holidays
            queryClient.invalidateQueries({ queryKey: ["holidays"] })
        },
    })
}

