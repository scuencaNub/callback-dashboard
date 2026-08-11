import { useQuery } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export interface CallbackNotAcceptedDetailItem {
    contact_id: string
    start_timestamp: string
    processed_at: string
    callback_queue_name: string
    origin_queue_arn?: string
    origin_queue_name?: string
    callback_already_offered?: boolean
    selected_callback_type?: string
    outcome?: string | null
    active_flow?: boolean
    ewt_given_minutes?: number | null
    [key: string]: unknown
}

export interface CallbackNotAcceptedDetailResponse {
    items: CallbackNotAcceptedDetailItem[]
    count: number
}

async function fetchCallbackNotAcceptedDetail(
    date?: string,
    callbackQueueName?: string
): Promise<CallbackNotAcceptedDetailResponse> {
    const idToken = await getIdToken()

    const params = new URLSearchParams()
    if (date) params.append("date", date)
    if (callbackQueueName) params.append("callback_queue_name", callbackQueueName)

    const url = params.toString()
        ? `${config.callbackNotAcceptedDetailUrl}?${params.toString()}`
        : config.callbackNotAcceptedDetailUrl

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
        },
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
            errorData.error || errorData.message || `HTTP error! status: ${response.status}`
        )
    }

    const data = await response.json()
    const result = typeof data.body === "string" ? JSON.parse(data.body) : data.body || data
    return result
}

export function useCallbackNotAcceptedDetail(date?: string, callbackQueueName?: string) {
    return useQuery({
        queryKey: ["callback-not-accepted-detail", date, callbackQueueName],
        queryFn: () => fetchCallbackNotAcceptedDetail(date, callbackQueueName),
        staleTime: 30_000,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    })
}
