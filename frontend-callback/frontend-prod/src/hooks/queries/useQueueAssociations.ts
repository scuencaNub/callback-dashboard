import { useQuery } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export interface QueueAssociation {
    queue_arn: string
    queue_name: string
    force_callback_enable: boolean
    [key: string]: any
}

interface QueueAssociationsResponse {
    items: QueueAssociation[]
    count: number
}

const fetchQueueAssociations = async (): Promise<QueueAssociation[]> => {
    const idToken = await getIdToken()

    const response = await fetch(`${config.queueAssociationsUrl}`, {
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        }
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: QueueAssociationsResponse = await response.json()
    return data.items
}

export function useQueueAssociations() {
    return useQuery({
        queryKey: ["queue-associations"],
        queryFn: fetchQueueAssociations,
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    })
}
