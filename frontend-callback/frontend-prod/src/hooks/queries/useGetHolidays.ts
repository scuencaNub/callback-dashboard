import { useQuery } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export type QueueOverride = {
    queue_name: string
    enabled?: boolean
    start_time_asap?: string
    stop_time_asap?: string
}

export type Holiday = {
    date: string
    name: string
    description: string
    configuration_type: "Completely disable callbacks" | "Only allow scheduled callbacks" | "Partial operation"
    queue_overrides?: QueueOverride[]
}
const fetchHolidays = async (): Promise<Holiday[]> => {
    const idToken = await getIdToken()

    const response = await fetch(`${config.holidayUrl}`, {
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        }
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data: Holiday[] = await response.json()
    return data
}

export function useGetHolidays() {
    return useQuery({
        queryKey: ["holidays"],
        queryFn: fetchHolidays,
        staleTime: 30_000,
        refetchInterval: false,
    })
}
