import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"
import { useDataStore } from "../../stores/useDataStore"

interface UpdateCallInSystemRequest {
    contact_id_inbound: string
    current_call_at: string
    queue_id?: string
    queue_name?: string
    call_at?: string
    status?: string
    retries?: number
    contact_flow_id?: string
    outbound_phone_number?: string
    agent_id?: string
    agent_name?: string
    contact_id_outbound?: string
    retry_attempt_interval?: number
    timestamp?: Record<string, any>
}

interface UpdateCallInSystemResponse {
    contact_id_inbound: string
    customer_phone_number: string
    call_at: string
    status: string
    queue_name: string
    queue_id: string
    retries: number
    contact_flow_id: string
    outbound_phone_number: string
    agent_id: string
    agent_name: string
    contact_id_outbound: string
    retry_attempt_interval: number
    timestamp: Record<string, any>
}

const updateCallInSystem = async (data: UpdateCallInSystemRequest): Promise<UpdateCallInSystemResponse> => {
    const idToken = await getIdToken()

    const { contact_id_inbound, current_call_at, ...updateFields } = data

    // Build request body with current_call_at for identification
    const requestBody = {
        current_call_at,
        ...updateFields
    }

    const response = await fetch(`${config.updateCallInSystemUrl}/${contact_id_inbound}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
}

export function useUpdateCallInSystem() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateCallInSystem,
        onSuccess: async (updatedCall, variables) => {
            // Update the store optimistically with the returned data
            // Use current_call_at from variables to find the item (it's the old call_at)
            const currentCallbacks = useDataStore.getState().callbacks
            const updatedCallbacks = currentCallbacks.map((callback: any) =>
                callback.contact_id_inbound === updatedCall.contact_id_inbound &&
                    callback.call_at === variables.current_call_at
                    ? {
                        ...callback,
                        ...updatedCall
                    }
                    : callback
            )
            useDataStore.setState({ callbacks: updatedCallbacks })

            // Invalidate and refetch callbacks to get updated data from server
            await queryClient.invalidateQueries({ queryKey: ["callbacks"] })
            // Force refetch all callbacks queries
            await queryClient.refetchQueries({ queryKey: ["callbacks"] })
        },
    })
}

