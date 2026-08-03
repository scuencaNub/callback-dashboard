import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export interface UpdateThresholdConfigurationPayload {
    status: boolean
    mode: "AUTOMATIC" | "MANUAL"
    activation_threshold: number
    deactivation_threshold: number
    priority_mode: "AGENT" | "CUSTOMER"
    schedule_programming: {
        day: string
        start_at: string | null
        end_at: string | null
        status: boolean
    }[]
}

const updateThresholdConfiguration = async (payload: UpdateThresholdConfigurationPayload): Promise<any> => {
    const idToken = await getIdToken()

    const response = await fetch(`${config.updateCallbackConfigurationUrl}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update threshold configuration' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
}

export function useUpdateThresholdConfiguration() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateThresholdConfiguration,
        onSuccess: () => {
            // Invalidate and refetch threshold configuration
            queryClient.invalidateQueries({ queryKey: ["threshold-configuration"] })
        },
    })
}

