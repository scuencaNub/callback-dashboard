import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

// QueueConfiguration type for optimistic updates
interface QueueConfiguration {
    queue_id: string
    queue_name: string
    max_retry_attempts: number
    retry_attempt_interval: string | number
    stop_on_voicemail: boolean
    [key: string]: any
}

export interface UpdateQueueConfigurationPayload {
    max_retry_attempts?: number
    retry_attempt_interval?: number
    stop_on_voicemail?: boolean
    allowed_callback_type?: "ALLOW_SCHEDULING" | "NOT_ALLOW_SCHEDULING"
    allow_only_next_day?: boolean
    business_hours_custom_message?: string
    business_hours_enable?: boolean
    start_time_asap?: string | null
    stop_time_asap?: string | null
    stop_time_asap_enable?: boolean
    ewt_max_minutes_enable?: boolean
    ewt_max_minutes?: number
}

const updateQueueConfiguration = async (queueName: string, payload: UpdateQueueConfigurationPayload): Promise<any> => {
    const idToken = await getIdToken()

    // Use queue_name in the URL (URL encode it to handle special characters)
    const encodedQueueName = encodeURIComponent(queueName)
    const response = await fetch(`${config.updateQueueConfigurationUrl}/${encodedQueueName}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update queue configuration' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
}

export function useUpdateQueueConfiguration() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ queueName, payload }: { queueName: string; payload: UpdateQueueConfigurationPayload }) =>
            updateQueueConfiguration(queueName, payload),
        onMutate: async ({ queueName, payload }) => {
            // Cancel any outgoing refetches to avoid overwriting our optimistic update
            await queryClient.cancelQueries({ queryKey: ["queue-configurations"] })

            // Snapshot the previous value
            const previousQueues = queryClient.getQueryData<QueueConfiguration[]>(["queue-configurations"])

            // Optimistically update the cache
            if (previousQueues) {
                queryClient.setQueryData<QueueConfiguration[]>(["queue-configurations"], (old) => {
                    if (!old) return old
                    return old.map((queue) => {
                        if (queue.queue_name === queueName) {
                            return {
                                ...queue,
                                ...payload,
                            }
                        }
                        return queue
                    })
                })
            }

            // Return a context object with the snapshotted value
            return { previousQueues }
        },
        onError: (err, _variables, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousQueues) {
                queryClient.setQueryData(["queue-configurations"], context.previousQueues)
            }
            console.error("Error updating queue configuration", err)
        },
        onSuccess: () => {
            // Invalidate and refetch queue configurations to ensure consistency
            queryClient.invalidateQueries({ queryKey: ["queue-configurations"] })
        },
    })
}
