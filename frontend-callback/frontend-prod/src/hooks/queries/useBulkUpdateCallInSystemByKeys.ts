import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"
import { useDataStore } from "../../stores/useDataStore"

export type BulkKey = {
    contact_id_inbound: string
    call_at: string
}

export type BulkUpdateFields = {
    status?: string
    queue_name?: string
    queue_id?: string
    call_at?: string
}

type BulkUpdateByKeysRequest = {
    items: BulkKey[]
    update_fields: BulkUpdateFields
    max_concurrency?: number
}

type BulkUpdateByKeysResponse = {
    summary: {
        matched: number
        processed: number
        failed: number
    }
    update_fields: BulkUpdateFields
    errors?: Array<{ contact_id_inbound: string; error: string }>
}

async function bulkUpdateByKeys(payload: BulkUpdateByKeysRequest): Promise<BulkUpdateByKeysResponse> {
    const idToken = await getIdToken()

    const response = await fetch(config.bulkUpdateCallInSystemByKeysUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
}

export function useBulkUpdateCallInSystemByKeys() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: bulkUpdateByKeys,
        onSuccess: async (_data, variables) => {
            // Best-effort optimistic store update (no server payload per item)
            const { update_fields, items } = variables
            const currentCallbacks = useDataStore.getState().callbacks

            const updated = currentCallbacks.map((cb: any) => {
                const match = items.find((k) => k.contact_id_inbound === cb.contact_id_inbound && k.call_at === cb.call_at)
                if (!match) return cb
                return { ...cb, ...update_fields }
            })

            useDataStore.setState({ callbacks: updated })
            await queryClient.invalidateQueries({ queryKey: ["callbacks"] })
            await queryClient.refetchQueries({ queryKey: ["callbacks"] })
        },
    })
}


