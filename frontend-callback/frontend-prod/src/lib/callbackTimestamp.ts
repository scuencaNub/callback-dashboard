export type FormatMessage = (options: { id: string }) => string

/**
 * Human-readable label for callback timestamp keys.
 * Supports both flat API keys (cb_registered, cb_retry_1, ...) and legacy (CB_REGISTERED, "CB retry 1", ...).
 */
export function formatTimestampKey(key: string, formatMessage: FormatMessage): string {
    const keyMap: Record<string, string> = {
        "CB_REGISTERED": "Registered",
        "CB REGISTERED": "Registered",
        "cb_registered": "Registered",
        "CB retry 1": formatMessage({ id: 'callbacks.retry' }) + " 1",
        "CB_retry 1": formatMessage({ id: 'callbacks.retry' }) + " 1",
        "cb_retry_1": formatMessage({ id: 'callbacks.retry' }) + " 1",
        "CB retry 2": formatMessage({ id: 'callbacks.retry2' }),
        "cb_retry_2": formatMessage({ id: 'callbacks.retry2' }),
        "CB retry 3": formatMessage({ id: 'callbacks.retry3' }),
        "cb_retry_3": formatMessage({ id: 'callbacks.retry3' }),
        "COMPLETED": "Completed",
        "completed": "Completed",
        "CANCELLED": "Cancelled",
        "cancelled": "Cancelled",
        "RESCHEDULED": "Rescheduled",
        "rescheduled": "Rescheduled",
        "FAILED": "Failed",
        "failed": "Failed",
    }
    return keyMap[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Sort order for callback timestamp events (flat and legacy keys).
 */
export function getTimestampOrder(key: string): number {
    const order: Record<string, number> = {
        "CB_REGISTERED": 1,
        "CB REGISTERED": 1,
        "cb_registered": 1,
        "CB retry 1": 2,
        "CB_retry 1": 2,
        "cb_retry_1": 2,
        "CB retry 2": 3,
        "cb_retry_2": 3,
        "CB retry 3": 4,
        "cb_retry_3": 4,
        "COMPLETED": 5,
        "completed": 5,
        "CANCELLED": 6,
        "cancelled": 6,
        "RESCHEDULED": 7,
        "rescheduled": 7,
        "FAILED": 8,
        "failed": 8,
    }
    return order[key] ?? 999
}
