import { useMutation } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"
import type { CallbackHistoryItem } from "./useQueryConnectContacts"

export interface QueryReportByDateRequest {
    phone_numbers?: string[]
    start_date: string
    end_date: string
    page_size?: number
    next_page_token?: string
}

export interface QueryReportByDateResponse {
    reportId?: string
    status?: string
    items: CallbackHistoryItem[]
    total?: number
    queryExecutionId?: string
    next_page_token?: string
}

async function queryReportByDate(
    payload: QueryReportByDateRequest
): Promise<QueryReportByDateResponse> {
    const idToken = await getIdToken()

    const response = await fetch(config.reportByDateUrl, {
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

export function useQueryReportByDate() {
    return useMutation({
        mutationFn: queryReportByDate,
    })
}

