import { useMutation } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export interface QueryCallbackHistoryRequest {
    phone_numbers?: string[]
    start_date: string
    end_date: string
    page_size?: number
    next_page_token?: string
}

export interface CallbackHistoryItem {
    contact_id_inbound: string
    customer_phone_number: string
    queue_name?: string
    callback_type?: string
    status: string
    call_at: string
    retries?: number | string
    agent_name?: string
    /** @deprecated Prefer flat fields: cb_registered, cb_retry_1, completed, etc. */
    timestamp?: Record<string, string>
    queue_id?: string
    contact_flow_id?: string
    outbound_phone_number?: string
    agent_id?: string
    contact_id_outbound?: string
    retry_attempt_interval?: number | string
    // New format from Athena query
    cb_registered?: string
    cb_retry_1?: string
    cb_retry_2?: string
    cb_retry_3?: string
    completed?: string
    cancelled?: string
    rescheduled?: string
    failed?: string
    flow_arn?: string
    ewt_given?: string
    ani?: string
    dnis?: string
    original_call_at?: string
    timestamp_string?: string
}

export interface QueryCallbackHistoryResponse {
    items: CallbackHistoryItem[]
    next_page_token?: string
}

async function queryCallbackHistory(
    payload: QueryCallbackHistoryRequest
): Promise<QueryCallbackHistoryResponse> {
    const idToken = await getIdToken()

    const response = await fetch(config.queryCallbackHistoryUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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

const DEFAULT_PAGE_SIZE = 500

/**
 * Fetches all pages of callback history for the given request.
 * Use for exports (e.g. full CSV) where the full result set is needed.
 */
export async function fetchAllCallbackHistoryPages(
    request: Omit<QueryCallbackHistoryRequest, "next_page_token">
): Promise<CallbackHistoryItem[]> {
    const pageSize = request.page_size ?? DEFAULT_PAGE_SIZE
    const allItems: CallbackHistoryItem[] = []
    let nextToken: string | undefined

    do {
        const response = await queryCallbackHistory({
            ...request,
            page_size: pageSize,
            next_page_token: nextToken,
        })
        allItems.push(...response.items)
        nextToken = response.next_page_token
    } while (nextToken)

    return allItems
}

export function useQueryConnectContacts() {
    return useMutation({
        mutationFn: queryCallbackHistory,
    })
}

