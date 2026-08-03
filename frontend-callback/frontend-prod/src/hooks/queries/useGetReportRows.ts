import { useQuery } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export interface ReportRow {
  [key: string]: string
}

export interface GetReportRowsResponse {
  rows: ReportRow[]
  page: number
  pageSize: number
  totalRows?: number
}

async function fetchReportRows(reportId: string, page: number, pageSize: number): Promise<GetReportRowsResponse> {
  const idToken = await getIdToken()

  const url = `${config.reportsUrl}/${encodeURIComponent(reportId)}/rows?page=${page}&pageSize=${pageSize}`

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
  return typeof data.body === "string" ? JSON.parse(data.body) : (data.body || data)
}

export function useGetReportRows(reportId: string | null, page: number, pageSize: number) {
  return useQuery({
    queryKey: ["reportRows", reportId, page, pageSize],
    queryFn: () => {
      if (!reportId) {
        throw new Error("reportId is required")
      }
      return fetchReportRows(reportId, page, pageSize)
    },
    enabled: !!reportId,
  })
}

