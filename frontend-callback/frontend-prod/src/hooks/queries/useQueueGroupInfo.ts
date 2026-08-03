import { useQuery } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export interface QueueGroupInfo {
    queue_group_name: string
    after_threshold_behavior: "QUEUE" | "CALLBACK"
}

interface QueueGroupInfoResponse {
    items: QueueGroupInfo[]
    count: number
}

const fetchQueueGroupInfo = async (): Promise<QueueGroupInfo[]> => {
    const idToken = await getIdToken()

    const response = await fetch(config.queueGroupInfoUrl, {
        headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
        },
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: QueueGroupInfoResponse = await response.json()
    return data.items
}

export function useQueueGroupInfo() {
    return useQuery<QueueGroupInfo[]>({
        queryKey: ["queueGroupInfo"],
        queryFn: fetchQueueGroupInfo,
    })
}
