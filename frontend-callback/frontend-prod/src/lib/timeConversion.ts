/**
 * Time conversion utilities for UTC and UTC-4 (Puerto Rico timezone)
 *
 * Backend stores times in UTC format (HH:mm)
 * Frontend displays times in UTC-4 format (Puerto Rico timezone)
 */

/**
 * Convert UTC time to UTC-4 for display (subtract 4 hours)
 * Used when reading from backend to show to user
 *
 * @param time - Time string in format "HH:mm" or "H:mm" (UTC)
 * @returns Time string in format "HH:mm" (UTC-4) or empty string if invalid
 *
 * @example
 * convertUTCToLocal("12:00") // returns "08:00" (12:00 UTC = 08:00 UTC-4)
 * convertUTCToLocal("02:30") // returns "22:30" (wraps to previous day)
 */
export const convertUTCToLocal = (time: string | null | undefined): string => {
    if (!time) return ""

    const match = time.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return time

    let hours = parseInt(match[1], 10)
    const minutes = match[2]

    // Convert from UTC to UTC-4 (subtract 4 hours)
    hours = hours - 4

    // Handle negative hours (wrap around to previous day)
    if (hours < 0) {
        hours = hours + 24
    }

    // Format as HH:mm
    return `${hours.toString().padStart(2, "0")}:${minutes}`
}

/**
 * Convert UTC-4 time to UTC for backend (add 4 hours)
 * Used when sending user input to backend
 *
 * @param time - Time string in format "HH:mm" (UTC-4, user input)
 * @returns Time string in format "HH:mm" (UTC) or empty string if invalid
 *
 * @example
 * convertLocalToUTC("08:00") // returns "12:00" (08:00 UTC-4 = 12:00 UTC)
 * convertLocalToUTC("22:30") // returns "02:30" (wraps to next day)
 */
export const convertLocalToUTC = (time: string | null | undefined): string => {
    if (!time) return ""

    const match = time.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return time

    let hours = parseInt(match[1], 10)
    const minutes = match[2]

    // Convert from UTC-4 to UTC (add 4 hours)
    hours = hours + 4

    // Handle hours >= 24 (wrap around to next day)
    if (hours >= 24) {
        hours = hours - 24
    }

    // Format as HH:mm
    return `${hours.toString().padStart(2, "0")}:${minutes}`
}

/**
 * Convert backend UTC timestamp "YYYY-MM-DD HH:mm" to UTC-4 datetime-local "YYYY-MM-DDTHH:mm".
 * This is timezone-agnostic (does not depend on the browser timezone).
 */
export const convertUtcTimestampToLocalDateTime = (timestampUtc: string | null | undefined): string => {
    if (!timestampUtc) return ""

    const m = timestampUtc.trim().match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/)
    if (!m) return timestampUtc.replace(" ", "T").slice(0, 16)

    const [, y, mo, d, hh, mm] = m
    const utcMillis = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm))
    const localMillis = utcMillis - 4 * 60 * 60 * 1000
    const dt = new Date(localMillis)

    const pad2 = (n: number) => n.toString().padStart(2, "0")
    return (
        `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}` +
        `T${pad2(dt.getUTCHours())}:${pad2(dt.getUTCMinutes())}`
    )
}

/**
 * Convert UI datetime-local "YYYY-MM-DDTHH:mm" (interpreted as UTC-4) to backend UTC timestamp
 * "YYYY-MM-DD HH:mm".
 * This is timezone-agnostic (does not depend on the browser timezone).
 */
export const convertLocalDateTimeToUtcTimestamp = (datetimeLocal: string | null | undefined): string => {
    if (!datetimeLocal) return ""

    const m = datetimeLocal.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
    if (!m) return datetimeLocal.replace("T", " ").slice(0, 16)

    const [, y, mo, d, hh, mm] = m
    const utcMillis = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm)) + 4 * 60 * 60 * 1000
    const dt = new Date(utcMillis)

    const pad2 = (n: number) => n.toString().padStart(2, "0")
    return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())} ${pad2(dt.getUTCHours())}:${pad2(dt.getUTCMinutes())}`
}

