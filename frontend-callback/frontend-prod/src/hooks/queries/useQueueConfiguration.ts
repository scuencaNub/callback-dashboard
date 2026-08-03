import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"
import { useDataStore } from "../../stores/useDataStore"

interface QueueConfiguration {
    queue_id: string
    queue_name: string
    max_retry_attempts: number
    retry_attempt_interval: string
    stop_on_voicemail: boolean
    business_hours_enable: boolean
    stop_time_asap_enable: boolean
    start_time_asap: string | null
    stop_time_asap: string
    ewt_max_minutes_enable: boolean
    ewt_max_minutes: string
    allowed_callback_type: string
    allow_only_next_day: boolean
    business_hours_custom_message: string
    phone_number_for_client: number
    outbound_phone_number: string
    flow_arn: string
}

interface QueueConfigurationResponse {
    items: QueueConfiguration[]
    count: number
}

const mapQueueConfigurationToQueue = (config: QueueConfiguration) => {
    return {
        id: config.queue_id,
        name: config.queue_name,
        description: `${config.allowed_callback_type} - Max retries: ${config.max_retry_attempts}`,
        status: config.business_hours_enable ? "active" : "inactive",
        active: config.business_hours_enable,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
}

const fetchQueueConfigurations = async (): Promise<QueueConfiguration[]> => {

    const idToken = await getIdToken()

    const response = await fetch(`${config.queueUrl}`, {
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        }
    })
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data: QueueConfigurationResponse = await response.json()
    return data.items
}

export function useQueueConfiguration() {
    const query = useQuery({
        queryKey: ["queue-configurations"],
        queryFn: fetchQueueConfigurations,
        staleTime: 30_000,
        refetchInterval: 60_000,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    })

    useEffect(() => {
        if (query.data) {
            useDataStore.setState({ queues: query.data.map(mapQueueConfigurationToQueue) })
        }
    }, [query.data])

    return {
        ...query,
        queueConfigurations: query.data || [],
        refetch: query.refetch
    }
}
