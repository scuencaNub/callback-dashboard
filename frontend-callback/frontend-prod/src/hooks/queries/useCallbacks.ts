import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"
import { useDataStore } from "../../stores/useDataStore"

interface PaginationOffset {
    status: string
    call_at: string
    contact_id_inbound: string
}

interface NextPageToken {
    status: string
    offset: PaginationOffset
}

interface PaginationRequest {
    page_size: number
    next_page_token?: NextPageToken[]
    currentPage?: number
}

interface ApiResponse {
    items: any[]
    nextPageToken?: NextPageToken[]  // Backend devuelve camelCase
    next_page_token?: NextPageToken[]  // Mantener compatibilidad
}
// Función que trae TODOS los datos automáticamente usando paginación interna
const fetchAllCallbacks = async (pageSize: number = 1000): Promise<any[]> => {

    const allItems: any[] = []
    let nextPageTokens: NextPageToken[] | undefined = undefined
    let pageCount = 0
    let currentPage = 0

    do {
        pageCount++

        const request: PaginationRequest = {
            page_size: pageSize,
            next_page_token: nextPageTokens,
            currentPage: currentPage
        }

        const response = await fetchCallbacksPaginated(request)

        allItems.push(...response.items)

        // Incrementar contador de páginas
        currentPage++

        // Preparar para la siguiente página
        // Backend devuelve nextPageToken (camelCase), pero acepta next_page_token (snake_case) en el request
        nextPageTokens = (response.nextPageToken || response.next_page_token) && (response.nextPageToken || response.next_page_token)!.length > 0
            ? (response.nextPageToken || response.next_page_token)
            : undefined

        // Si no hay más páginas, salir del loop
        if (!nextPageTokens || nextPageTokens.length === 0) {
            break
        }

    } while (nextPageTokens && nextPageTokens.length > 0)

    return allItems
}

const fetchCallbacksPaginated = async (request: PaginationRequest): Promise<ApiResponse> => {
    const { page_size, next_page_token } = request

    const idToken = await getIdToken()

    const requestBody = {
        page_size,
        ...(next_page_token ? { next_page_token } : {}),
    }

    const res = await fetch(`${config.callbackUrl}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
    })

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
    }

    const rawData = await res.json()

    // API Gateway puede devolver la respuesta envuelta en 'body' o directamente
    const data = (rawData as { body?: string | ApiResponse }).body
        ? (typeof (rawData as { body: string | ApiResponse }).body === 'string'
            ? JSON.parse((rawData as { body: string }).body)
            : (rawData as { body: ApiResponse }).body)
        : rawData as ApiResponse

    return data as ApiResponse
}

export function useCallbacks(pageSize: number = 100) {
    const query = useQuery({
        queryKey: ["callbacks", pageSize],
        queryFn: () => fetchAllCallbacks(pageSize),
        staleTime: 30_000,
        refetchInterval: 60_000,
    })

    useEffect(() => {
        if (query.data) {
            useDataStore.setState({ callbacks: query.data })
        }
    }, [query.data])

    useEffect(() => {
        if (query.data) {
            const pendingCount = query.data.filter(callback => callback.status === "PENDING").length
            useDataStore.getState().setPendingCallbacksCount(pendingCount)
        }
    }, [query.data])

    return {
        ...query,
        callbacks: query.data || [],
        isLoading: query.isLoading,
        refetch: query.refetch
    }
}
