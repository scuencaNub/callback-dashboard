import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Callback, Queue } from '../types'

export const useDataStore = create(
    devtools(
        persist(
            (set, _get) => ({
                callbacks: [] as Callback[],
                queues: [] as Queue[],
                isLoading: false,
                lastUpdate: null as Date | null,
                pendingCallbacksCount: 0,

                setCallbacks: (callbacks: Callback[]) => set({ callbacks, lastUpdate: new Date() }),
                setQueues: (queues: Queue[]) => set({ queues, lastUpdate: new Date() }),
                setLoading: (loading: boolean) => set({ isLoading: loading }),
                setPendingCallbacksCount: (count: number) => set({ pendingCallbacksCount: count }),
            }),
            {
                name: 'app-data-store',
                partialize: (state: any) => ({
                    lastUpdate: state.lastUpdate,
                    callbacks: state.callbacks,
                    queues: state.queues,
                    pendingCallbacksCount: state.pendingCallbacksCount,
                }),
            }
        ),
        {
            name: 'DataStore',
        }
    )
)
