import { useQuery } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export interface CallbackHistoricalSummaryItem {
    queue_name: string
    date: string
    time_slot: string
    callback_type: string
    status: string
    registered: number
}

export interface CallsInSystemDetailItem {
    contact_id_inbound: string
    customer_phone_number?: string
    call_at: string
    status: string
    queue_name: string
    queue_id?: string
    retries?: number
    contact_flow_id?: string
    outbound_phone_number?: string
    agent_id?: string
    agent_name?: string
    callback_type?: string
    contact_id_outbound?: string
    retry_attempt_interval?: number
    timestamp?: Record<string, string>
    [key: string]: unknown
}

export interface CallbackHistoricalSummaryResponse {
    items: CallbackHistoricalSummaryItem[]
    count: number
    details?: CallsInSystemDetailItem[]
}

async function fetchCallbackHistoricalSummary(
    queueName: string,
    date: string,
    statuses?: string[],
    includeDetails?: boolean
): Promise<CallbackHistoricalSummaryResponse> {
    const idToken = await getIdToken()

    const params = new URLSearchParams()
    params.append('queue_name', queueName)
    params.append('date', date)
    if (statuses && statuses.length > 0) {
        params.append('status', statuses.join(','))
    }
    if (includeDetails) {
        params.append('include_details', 'true')
    }

    const url = `${config.callbackHistoricalSummaryUrl}?${params.toString()}`

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

export function useCallbackHistoricalSummary(
    queueName?: string,
    date?: string,
    statuses?: string[],
    includeDetails?: boolean
) {
    return useQuery({
        queryKey: ["callback-historical-summary", queueName, date, statuses, includeDetails],
        queryFn: () => fetchCallbackHistoricalSummary(queueName!, date!, statuses, includeDetails),
        enabled: Boolean(queueName && date),
        staleTime: 30_000,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    })
}
