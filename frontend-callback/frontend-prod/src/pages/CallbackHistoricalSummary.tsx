import { Container, Header } from "@cloudscape-design/components"
import { BarChart3, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Download, Loader2, XCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useIntl } from "react-intl"
import { PageLayout } from "../components/pageLayout"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Checkbox } from "../components/ui/checkbox"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import {
    useCallbackHistoricalSummary,
    type CallbackHistoricalSummaryItem,
    type CallsInSystemDetailItem,
} from "../hooks/queries/useCallbackHistoricalSummary"
import { useQueues } from "../hooks/queries/useQueues"

const STATUS_OPTIONS = ['COMPLETED', 'CANCELLED', 'RESCHEDULED', 'FAILED', 'PENDING']
const SLOT_MINUTES = 15
const ROWS_PER_PAGE = 25

const STATUS_ICONS: Record<string, typeof Clock> = {
    COMPLETED: CheckCircle,
    FAILED: XCircle,
    CANCELLED: XCircle,
    RESCHEDULED: Clock,
    PENDING: Clock,
}

const STATUS_ICON_COLORS: Record<string, string> = {
    COMPLETED: "text-green-500",
    FAILED: "text-red-500",
    CANCELLED: "text-red-500",
    RESCHEDULED: "text-yellow-500",
    PENDING: "text-yellow-500",
}

type SortColumn = keyof CallbackHistoricalSummaryItem

const PR_UTC_OFFSET_HOURS = 4 // Puerto Rico is UTC-4, no DST

function timeSlotFromCallAt(callAt: string | undefined): string | null {
    if (!callAt) return null
    // call_at is stored in CallsInSystem as UTC -- convert to Puerto
    // Rico time before bucketing, same criteria as the backend, so the
    // detail rows land in the same slot group as the summary count.
    const match = callAt.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/)
    if (!match) return null
    const [, year, month, day, hour, minute] = match
    const utcDate = new Date(Date.UTC(
        Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)
    ))
    const prDate = new Date(utcDate.getTime() - PR_UTC_OFFSET_HOURS * 60 * 60 * 1000)
    const prHour = prDate.getUTCHours()
    const prMinute = prDate.getUTCMinutes()
    const slotMinute = Math.floor(prMinute / SLOT_MINUTES) * SLOT_MINUTES
    return `${String(prHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`
}

function groupKey(timeSlot: string, callbackType: string, status: string): string {
    return `${timeSlot}__${callbackType}__${status}`
}

// CallsInSystem stores timestamps in UTC. The backend converts to Puerto
// Rico time when it buckets by slot; the raw detail fields (call_at,
// cb_registered) come through in UTC. Convert them to PR (UTC-4, no DST)
// for display and CSV so the shown times match the slot. Slot grouping is
// left untouched (it keeps using the raw UTC value via timeSlotFromCallAt).
function formatUtcToPr(utcString: string | undefined): string {
    if (!utcString) return ''
    const match = utcString.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
    if (!match) return utcString
    const [, year, month, day, hour, minute, second] = match
    const utcDate = new Date(Date.UTC(
        Number(year), Number(month) - 1, Number(day),
        Number(hour), Number(minute), Number(second ?? 0)
    ))
    const prDate = new Date(utcDate.getTime() - PR_UTC_OFFSET_HOURS * 60 * 60 * 1000)
    const p = (n: number) => String(n).padStart(2, '0')
    const datePart = `${prDate.getUTCFullYear()}-${p(prDate.getUTCMonth() + 1)}-${p(prDate.getUTCDate())}`
    const timePart = `${p(prDate.getUTCHours())}:${p(prDate.getUTCMinutes())}:${p(prDate.getUTCSeconds())}`
    return `${datePart} ${timePart}`
}

export default function CallbackHistoricalSummary() {
    const { formatMessage: t } = useIntl()
    const [selectedQueue, setSelectedQueue] = useState<string | undefined>(undefined)
    const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0])
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
    const [sortState, setSortState] = useState<{ column: SortColumn | null; direction: 'asc' | 'desc' | null }>({ column: null, direction: null })
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [currentPage, setCurrentPage] = useState(1)

    const { data: queues = [], isLoading: isLoadingQueues } = useQueues()
    // Status is filtered client-side (not sent to the backend) so the
    // per-status total cards always reflect the full day, independent
    // of which checkboxes are ticked for the table view.
    const { data, isLoading, error } = useCallbackHistoricalSummary(
        selectedQueue,
        selectedDate || undefined,
        undefined,
        true
    )

    const allItems = data?.items || []
    const details = data?.details || []

    // group the flat detail list by the same (time_slot, callback_type, status)
    // key used for the summary rows, so expanding a row shows exactly the
    // contacts that make up its count.
    const detailsByGroup = useMemo(() => {
        const groups = new Map<string, CallsInSystemDetailItem[]>()
        for (const detail of details) {
            const timeSlot = timeSlotFromCallAt(detail.call_at)
            if (!timeSlot) continue
            const key = groupKey(timeSlot, detail.callback_type || '(unknown)', detail.status || '(unknown)')
            const existing = groups.get(key) || []
            existing.push(detail)
            groups.set(key, existing)
        }
        return groups
    }, [details])

    // total registered per status across the whole day, unaffected by
    // the checkbox filter -- same idea as the status cards in the main
    // Dashboard.
    const totalsByStatus = useMemo(() => {
        const totals: Record<string, number> = {}
        for (const status of STATUS_OPTIONS) totals[status] = 0
        for (const item of allItems) {
            totals[item.status] = (totals[item.status] ?? 0) + item.registered
        }
        return totals
    }, [allItems])

    const items = useMemo(() => {
        if (selectedStatuses.length === 0) return allItems
        return allItems.filter(item => selectedStatuses.includes(item.status))
    }, [allItems, selectedStatuses])

    const handleClearFilters = () => {
        setSelectedQueue(undefined)
        setSelectedDate(new Date().toISOString().split('T')[0])
        setSelectedStatuses([])
        setSortState({ column: null, direction: null })
        setExpandedRows(new Set())
        setCurrentPage(1)
    }

    const toggleStatus = (status: string) => {
        setSelectedStatuses(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        )
        setCurrentPage(1)
    }

    const toggleExpanded = (key: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev)
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }

    function compareValues(a: unknown, b: unknown): number {
        if (a == null && b == null) return 0
        if (a == null) return 1
        if (b == null) return -1
        const numA = Number(a)
        const numB = Number(b)
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB
        return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
    }

    function handleSort(column: SortColumn) {
        setSortState(prev => {
            if (prev.column !== column) return { column, direction: 'asc' }
            if (prev.direction === 'asc') return { column, direction: 'desc' }
            return { column: null, direction: null }
        })
        setCurrentPage(1)
    }

    const sortedItems = useMemo(() => {
        if (!sortState.column || !sortState.direction) return items
        return [...items].sort((a, b) => {
            const cmp = compareValues(a[sortState.column as SortColumn], b[sortState.column as SortColumn])
            return sortState.direction === 'asc' ? cmp : -cmp
        })
    }, [items, sortState])

    const totalPages = Math.max(1, Math.ceil(sortedItems.length / ROWS_PER_PAGE))

    useEffect(() => {
        setCurrentPage(1)
    }, [selectedQueue, selectedDate])

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * ROWS_PER_PAGE
        return sortedItems.slice(start, start + ROWS_PER_PAGE)
    }, [sortedItems, currentPage])

    const renderSortIcon = (column: SortColumn) => (
        <>
            {sortState.column === column && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
            {sortState.column === column && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
        </>
    )

    const exportToCSV = () => {
        if (sortedItems.length === 0) return

        // One row per contact (not per slot summary) -- expands each
        // slot group using the same detail data shown when a row is
        // expanded in the table, so the CSV carries the full breakdown
        // without a separate backend call.
        const headers = [
            'Queue Name', 'Date', 'Time Slot', 'Callback Type', 'Status', 'Registered',
            'Contact ID', 'Customer Phone', 'Call At', 'Registered At', 'Agent', 'Retries', 'Outbound Contact ID',
        ]

        const rows: string[][] = []
        for (const item of sortedItems) {
            const key = groupKey(item.time_slot, item.callback_type, item.status)
            const rowDetails = detailsByGroup.get(key) || []

            if (rowDetails.length === 0) {
                rows.push([
                    item.queue_name, item.date, item.time_slot, item.callback_type, item.status, String(item.registered),
                    '', '', '', '', '', '', '',
                ])
                continue
            }

            for (const detail of rowDetails) {
                rows.push([
                    item.queue_name, item.date, item.time_slot, item.callback_type, item.status, String(item.registered),
                    detail.contact_id_inbound,
                    detail.customer_phone_number || '',
                    formatUtcToPr(detail.call_at),
                    formatUtcToPr(detail.timestamp?.CB_REGISTERED),
                    detail.agent_name || '',
                    detail.retries != null ? String(detail.retries) : '',
                    detail.contact_id_outbound || '',
                ])
            }
        }

        const escapeCSV = (value: string): string => {
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`
            }
            return value
        }

        const csvContent = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(escapeCSV).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        const queuePart = selectedQueue ? `_${selectedQueue.replace(/[^a-zA-Z0-9]/g, '_')}` : ''
        const datePart = selectedDate ? `_${selectedDate}` : ''
        const filename = `historical_summary${queuePart}${datePart}.csv`

        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <PageLayout title={t({ id: 'historicalSummary.title' })}>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                {STATUS_OPTIONS.map((status) => {
                    const Icon = STATUS_ICONS[status]
                    return (
                        <div key={status} className="rounded-md">
                            <Container
                                header={
                                    <Header variant="h3">
                                        <span className="flex items-center gap-2 text-sm">
                                            <Icon className={`h-4 w-4 ${STATUS_ICON_COLORS[status]}`} />
                                            <span className="whitespace-nowrap text-black">{status}</span>
                                        </span>
                                    </Header>
                                }
                                disableContentPaddings
                            >
                                <div className="p-5 pt-0">
                                    <div className="text-3xl font-bold">
                                        {selectedQueue && isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : totalsByStatus[status] ?? 0}
                                    </div>
                                </div>
                            </Container>
                        </div>
                    )
                })}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                {t({ id: 'historicalSummary.pageTitle' })}
                            </CardTitle>
                            <CardDescription>
                                {t({ id: 'historicalSummary.description' })}
                            </CardDescription>
                        </div>
                        {items.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToCSV}
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                {t({ id: 'historicalSummary.downloadCSV' })}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label htmlFor="queue-filter">{t({ id: 'historicalSummary.filterByQueue' })}</Label>
                            <Select value={selectedQueue || ""} onValueChange={(value) => setSelectedQueue(value === "none" ? undefined : value)}>
                                <SelectTrigger id="queue-filter">
                                    <SelectValue placeholder={t({ id: 'historicalSummary.selectQueue' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    {queues.map((queue) => (
                                        <SelectItem key={queue.id} value={queue.name}>
                                            {queue.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date-filter">{t({ id: 'historicalSummary.filterByDate' })}</Label>
                            <Input
                                id="date-filter"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>{t({ id: 'historicalSummary.filterByStatus' })}</Label>
                            <div className="flex flex-wrap gap-3">
                                {STATUS_OPTIONS.map((status) => (
                                    <label key={status} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <Checkbox
                                            checked={selectedStatuses.includes(status)}
                                            onCheckedChange={() => toggleStatus(status)}
                                        />
                                        {status}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-end">
                            <Button variant="default" onClick={handleClearFilters} className="w-full">
                                {t({ id: 'common.clear' })}
                            </Button>
                        </div>
                    </div>

                    {!selectedQueue ? (
                        <div className="rounded-lg border p-4 text-center text-muted-foreground">
                            {t({ id: 'historicalSummary.selectQueuePrompt' })}
                        </div>
                    ) : isLoading || isLoadingQueues ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2">{t({ id: 'common.loading' })}</span>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center text-destructive">
                            {error instanceof Error ? error.message : t({ id: 'historicalSummary.error.loading' })}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="rounded-lg border p-4 text-center text-muted-foreground">
                            {t({ id: 'historicalSummary.noData' })}
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 text-sm text-muted-foreground">
                                {t({ id: 'historicalSummary.showingResults' }, { count: items.length })}
                            </div>
                            <div className="rounded-md border">
                                <Table containerClassName="max-h-[70vh] overflow-y-auto">
                                    <TableHeader className="sticky top-0 z-10 bg-background [&_th]:bg-background">
                                        <TableRow>
                                            <TableHead className="w-8" />
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('queue_name')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'historicalSummary.queueName' })}
                                                    {renderSortIcon('queue_name')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('date')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'historicalSummary.date' })}
                                                    {renderSortIcon('date')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('time_slot')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'historicalSummary.timeSlot' })}
                                                    {renderSortIcon('time_slot')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('callback_type')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'historicalSummary.callbackType' })}
                                                    {renderSortIcon('callback_type')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'historicalSummary.status' })}
                                                    {renderSortIcon('status')}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('registered')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'historicalSummary.registered' })}
                                                    {renderSortIcon('registered')}
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((item, index) => {
                                            const key = groupKey(item.time_slot, item.callback_type, item.status)
                                            const isExpanded = expandedRows.has(key)
                                            const rowDetails = detailsByGroup.get(key) || []

                                            return (
                                                <>
                                                    <TableRow
                                                        key={`${key}-${index}`}
                                                        className="cursor-pointer"
                                                        onClick={() => toggleExpanded(key)}
                                                    >
                                                        <TableCell>
                                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                        </TableCell>
                                                        <TableCell>{item.queue_name}</TableCell>
                                                        <TableCell>{item.date}</TableCell>
                                                        <TableCell>{item.time_slot}</TableCell>
                                                        <TableCell>{item.callback_type}</TableCell>
                                                        <TableCell>{item.status}</TableCell>
                                                        <TableCell>{item.registered}</TableCell>
                                                    </TableRow>
                                                    {isExpanded && (
                                                        <TableRow key={`${key}-${index}-detail`}>
                                                            <TableCell colSpan={7} className="bg-muted/30 p-0">
                                                                <DetailTable details={rowDetails} t={t} />
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                                <span>
                                    {t({ id: 'historicalSummary.pageOf' }, { current: currentPage, total: totalPages })}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        {t({ id: 'common.previous' })}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    >
                                        {t({ id: 'common.next' })}
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </PageLayout>
    )
}

function DetailTable({
    details,
    t,
}: {
    details: CallsInSystemDetailItem[]
    t: (descriptor: { id: string }) => string
}) {
    if (details.length === 0) {
        return (
            <div className="p-4 text-sm text-muted-foreground">
                {t({ id: 'historicalSummary.noDetails' })}
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t({ id: 'historicalSummary.contactId' })}</TableHead>
                    <TableHead>{t({ id: 'historicalSummary.customerPhone' })}</TableHead>
                    <TableHead>{t({ id: 'historicalSummary.callAt' })}</TableHead>
                    <TableHead>{t({ id: 'historicalSummary.cbRegisteredAt' })}</TableHead>
                    <TableHead>{t({ id: 'historicalSummary.agentName' })}</TableHead>
                    <TableHead>{t({ id: 'historicalSummary.retries' })}</TableHead>
                    <TableHead>{t({ id: 'historicalSummary.contactIdOutbound' })}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {details.map((detail, index) => (
                    <TableRow key={`${detail.contact_id_inbound}-${detail.call_at}-${index}`}>
                        <TableCell className="font-mono text-xs">{detail.contact_id_inbound}</TableCell>
                        <TableCell>{detail.customer_phone_number || '-'}</TableCell>
                        <TableCell>{formatUtcToPr(detail.call_at) || '-'}</TableCell>
                        <TableCell>{formatUtcToPr(detail.timestamp?.CB_REGISTERED) || '-'}</TableCell>
                        <TableCell>{detail.agent_name || '-'}</TableCell>
                        <TableCell>{detail.retries ?? '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{detail.contact_id_outbound || '-'}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
