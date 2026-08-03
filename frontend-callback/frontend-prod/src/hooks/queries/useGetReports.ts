import { useQuery } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export interface ReportJobItem {
    reportId: string
    type?: string
    status?: string
    createdAt?: string
    finishedAt?: string
    totalRowCount?: number
    params?: {
        start_date?: string
        end_date?: string
        phone_numbers?: string[]
    }
}

interface GetReportsResponse {
    items: ReportJobItem[]
    count?: number
}

async function fetchReports(): Promise<GetReportsResponse> {
    const idToken = await getIdToken()

    const response = await fetch(config.reportsUrl, {
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
    return typeof data.body === "string" ? JSON.parse(data.body) : (data.body || data)
}

export function useGetReports() {
    return useQuery({
        queryKey: ["reports", "mine"],
        queryFn: fetchReports,
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 2,
    })
}

