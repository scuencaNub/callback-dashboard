export function formatDateTime(dateString: string): string {
    try {
        const normalized = dateString.trim()

        const m = normalized.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/)
        if (!m) return "Invalid date"

        const [, y, mo, d, hh, mm, ss] = m
        const utcMillis = Date.UTC(
            Number(y),
            Number(mo) - 1,
            Number(d),
            Number(hh),
            Number(mm),
            ss ? Number(ss) : 0
        )
        const utcDate = new Date(utcMillis)
        if (isNaN(utcDate.getTime())) return "Invalid date"

        const fmt = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Puerto_Rico",
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        })

        const parts = fmt.formatToParts(utcDate)
        const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""

        // "MMM dd, yyyy HH:mm:ss"
        return `${get("month")} ${get("day")}, ${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`
    } catch (error) {
        console.error('Error formatting date:', error)
        return 'Invalid date'
    }
}
