import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"

export interface UpdateQueueGroupInfoPayload {
    after_threshold_behavior: "QUEUE" | "CALLBACK"
}

const updateQueueGroupInfo = async (
    queueGroupName: string,
    payload: UpdateQueueGroupInfoPayload
): Promise<any> => {
    const idToken = await getIdToken()

    const encoded = encodeURIComponent(queueGroupName)
    const response = await fetch(`${config.updateQueueGroupInfoUrl}/${encoded}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to update queue group info" }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
}

export function useUpdateQueueGroupInfo() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ queueGroupName, payload }: { queueGroupName: string; payload: UpdateQueueGroupInfoPayload }) =>
            updateQueueGroupInfo(queueGroupName, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["queueGroupInfo"] })
        },
    })
}
