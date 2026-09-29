import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"
import type { QueueAssociation } from "./useQueueAssociations"

export interface UpdateQueueAssociationPayload {
    queue_arn: string
    force_callback_enable: boolean
}

const updateQueueAssociation = async (payload: UpdateQueueAssociationPayload): Promise<any> => {
    const idToken = await getIdToken()

    const response = await fetch(`${config.queueAssociationsUrl}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update queue association' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
}

export function useUpdateQueueAssociation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (payload: UpdateQueueAssociationPayload) => updateQueueAssociation(payload),
        onMutate: async (payload) => {
            await queryClient.cancelQueries({ queryKey: ["queue-associations"] })

            const previousAssociations = queryClient.getQueryData<QueueAssociation[]>(["queue-associations"])

            if (previousAssociations) {
                queryClient.setQueryData<QueueAssociation[]>(["queue-associations"], (old) => {
                    if (!old) return old
                    return old.map((association) => {
                        if (association.queue_arn === payload.queue_arn) {
                            return {
                                ...association,
                                force_callback_enable: payload.force_callback_enable,
                            }
                        }
                        return association
                    })
                })
            }

            return { previousAssociations }
        },
        onError: (err, _variables, context) => {
            if (context?.previousAssociations) {
                queryClient.setQueryData(["queue-associations"], context.previousAssociations)
            }
            console.error("Error updating queue association", err)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["queue-associations"] })
        },
    })
}
