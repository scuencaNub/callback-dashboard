import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export interface BlockedAniItem {
    phone_number: string
    blocked_until: string
    created_at: string
}

interface BlockedAnisResponse {
    items: BlockedAniItem[]
    count: number
}

const fetchBlockedAnis = async (): Promise<BlockedAnisResponse> => {
    const idToken = await getIdToken()

    const response = await fetch(config.blockedAnisInfo, {
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        }
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
}

export function useBlockedAnisView() {
    return useQuery({
        queryKey: ["blocked-anis"],
        queryFn: fetchBlockedAnis,
        staleTime: 30_000,
    })
}

// --- Mutations ---

interface CreateBlockedAniPayload {
    phone_number: string
    blocked_until: string
}

interface UpdateBlockedAniPayload {
    phone_number: string
    blocked_until: string
}

const createBlockedAni = async (payload: CreateBlockedAniPayload): Promise<void> => {
    const idToken = await getIdToken()

    const response = await fetch(config.blockedAnisInfo, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }
}

const updateBlockedAni = async ({ originalPhoneNumber, payload }: { originalPhoneNumber: string; payload: UpdateBlockedAniPayload }): Promise<void> => {
    const idToken = await getIdToken()
    const encodedPhone = encodeURIComponent(originalPhoneNumber)

    const response = await fetch(`${config.blockedAnisInfo}/${encodedPhone}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`)
    }
}

const deleteBlockedAni = async (phoneNumber: string): Promise<void> => {
    const idToken = await getIdToken()
    const encodedPhone = encodeURIComponent(phoneNumber)

    const response = await fetch(`${config.blockedAnisInfo}/${encodedPhone}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }
}

export function useCreateBlockedAni() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: createBlockedAni,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocked-anis"] })
        },
    })
}

export function useUpdateBlockedAni() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: updateBlockedAni,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocked-anis"] })
        },
    })
}

export function useDeleteBlockedAni() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteBlockedAni,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocked-anis"] })
        },
    })
}
