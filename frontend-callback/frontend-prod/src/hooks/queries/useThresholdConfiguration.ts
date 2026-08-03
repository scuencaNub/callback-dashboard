import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { getIdToken } from "../../lib/auth-helpers"
import { config } from "../../config/env"
import { useDataStore } from "../../stores/useDataStore"

const fetchThresholdConfiguration = async (): Promise<any> => {

    const idToken = await getIdToken()

    const response = await fetch(`${config.thresholdUrl}`, {
        headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
        }
    })
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data: any = await response.json()
    return data;
}

export function useThresholdConfiguration() {
    const query = useQuery({
        queryKey: ["threshold-configuration"],
        queryFn: () => fetchThresholdConfiguration(),
        staleTime: 30_000,
        refetchInterval: 60_000,
    })

    useEffect(() => {
        if (query.data) {
            useDataStore.setState({ thresholdConfiguration: query.data })
        }
    }, [query.data])

    return {
        ...query,
        data: query.data,
        isLoading: query.isLoading,
        refetch: query.refetch
    }
}
