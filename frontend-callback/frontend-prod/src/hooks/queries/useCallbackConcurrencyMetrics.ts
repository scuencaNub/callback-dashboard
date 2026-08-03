import { useQuery } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export interface CallbackConcurrencyMetricsItem {
    queue_name_date: string
    time_slot_callback_type: string
    queue_name?: string
    date?: string
    time_slot?: string
    callback_type?: string
    [key: string]: any // For any additional fields
}

export interface CallbackConcurrencyMetricsResponse {
    items: CallbackConcurrencyMetricsItem[]
    count: number
}

async function fetchCallbackConcurrencyMetrics(
    queueName?: string,
    date?: string
): Promise<CallbackConcurrencyMetricsResponse> {
    const idToken = await getIdToken()

    // Build query parameters
    const params = new URLSearchParams()
    if (queueName) {
        params.append('queue_name', queueName)
    }
    if (date) {
        params.append('date', date)
    }

    const url = params.toString()
        ? `${config.callbackConcurrencyMetricsUrl}?${params.toString()}`
        : config.callbackConcurrencyMetricsUrl

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
        },
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // Handle API Gateway response format (body might be string or object)
    const result = typeof data.body === 'string' ? JSON.parse(data.body) : (data.body || data)

    return result
}

export function useCallbackConcurrencyMetrics(queueName?: string, date?: string) {
    return useQuery({
        queryKey: ["callback-concurrency-metrics", queueName, date],
        queryFn: () => fetchCallbackConcurrencyMetrics(queueName, date),
        staleTime: 30_000,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    })
}

