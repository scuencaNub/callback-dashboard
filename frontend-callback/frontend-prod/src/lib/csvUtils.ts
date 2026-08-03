/**
 * Escapes a value for CSV (quotes if contains comma, quote, or newline).
 */
export function escapeCSV(value: string): string {
    if (value === null || value === undefined) return ''
    const s = String(value)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
}

/**
 * Builds a CSV string from headers and rows (each row is an array of cell values).
 */
export function buildCsvString(headers: string[], rows: string[][]): string {
    const escape = escapeCSV
    const headerLine = headers.map(escape).join(',')
    const dataLines = rows.map(row => row.map(escape).join(','))
    return [headerLine, ...dataLines].join('\n')
}
