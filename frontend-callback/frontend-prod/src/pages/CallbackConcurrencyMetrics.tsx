import { BarChart3, ChevronDown, ChevronUp, Download, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useIntl } from "react-intl"
import { PageLayout } from "../components/pageLayout"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { useCallbackConcurrencyMetrics } from "../hooks/queries/useCallbackConcurrencyMetrics"
import { useQueues } from "../hooks/queries/useQueues"

export default function CallbackConcurrencyMetrics() {
    const { formatMessage: t } = useIntl()
    const [selectedQueue, setSelectedQueue] = useState<string | undefined>(undefined)
    const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0])
    const [selectedCallbackType, setSelectedCallbackType] = useState<string | undefined>(undefined)
    const [sortState, setSortState] = useState<{ column: string | null; direction: 'asc' | 'desc' | null }>({ column: null, direction: null })

    const { data: queues = [], isLoading: isLoadingQueues } = useQueues()
    const { data, isLoading, error } = useCallbackConcurrencyMetrics(
        selectedQueue || undefined,
        selectedDate || undefined
    )

    const handleClearFilters = () => {
        setSelectedQueue(undefined)
        // date is required by the endpoint, so reset to today instead of clearing
        setSelectedDate(new Date().toISOString().split('T')[0])
        setSelectedCallbackType(undefined)
        setSortState({ column: null, direction: null })
    }

    // --- Helper functions for sort ---
    function compareValues(a: unknown, b: unknown): number {
        if (a == null && b == null) return 0
        if (a == null) return 1
        if (b == null) return -1
        const numA = Number(a)
        const numB = Number(b)
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB
        return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
    }

    function handleSort(column: string) {
        setSortState(prev => {
            if (prev.column !== column) return { column, direction: 'asc' }
            if (prev.direction === 'asc') return { column, direction: 'desc' }
            return { column: null, direction: null }
        })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function getValueForColumn(metric: any, column: string): unknown {
        switch (column) {
            case 'queue_name':
                return metric.queue_name || metric.queue_name_date?.split('#')[0] || null
            case 'date':
                return metric.date || metric.queue_name_date?.split('#')[1] || null
            case 'time_slot':
                return metric.time_slot || metric.time_slot_callback_type?.split('#')[0] || null
            case 'callback_type':
                return metric.callback_type || metric.time_slot_callback_type?.split('#')[1] || null
            case 'offered':
                return metric.offered ?? null
            case 'registered':
                return metric.registered ?? null
            case 'enqueued':
                return metric.enqueued ?? null
            case 'total':
                return metric.total ?? null
            case 'limit':
                return metric.limit ?? null
            case 'utilization_pct':
                return metric.utilization_pct ?? null
            case 'scheduling_rate_pct':
                return metric.scheduling_rate_pct ?? null
            case 'rejection_count':
                return metric.rejection_count ?? null
            default:
                return metric[column] ?? null
        }
    }

    const exportToCSV = () => {
        if (!sortedMetrics || sortedMetrics.length === 0) {
            return
        }

        // Get all unique keys from all metrics (excluding internal keys)
        const excludedKeys = ['queue_name_date', 'time_slot_callback_type', 'queue_name', 'date', 'time_slot', 'callback_type', 'offered', 'registered', 'enqueued', 'total', 'limit', 'utilization_pct', 'scheduling_rate_pct', 'scheduling_rate_approx', 'rejection_count']
        const allKeys = new Set<string>()

        sortedMetrics.forEach(metric => {
            Object.keys(metric).forEach(key => {
                if (!excludedKeys.includes(key)) {
                    allKeys.add(key)
                }
            })
        })

        // Define CSV headers
        const headers = [
            'Queue Name',
            'Date',
            'Time Slot',
            'Callback Type',
            'Offered',
            'Registered',
            'Enqueued',
            'Total',
            'Limit',
            'Rejection Count',
            '% Utilization',
            '% Registration Rate',
            ...Array.from(allKeys).map(key =>
                key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
            )
        ]

        // Convert items to CSV rows
        const rows = sortedMetrics.map((metric) => {
            const queueName = metric.queue_name || metric.queue_name_date?.split('#')[0] || '-'
            const date = metric.date || metric.queue_name_date?.split('#')[1] || '-'
            const timeSlot = metric.time_slot || metric.time_slot_callback_type?.split('#')[0] || '-'
            const callbackType = metric.callback_type || metric.time_slot_callback_type?.split('#')[1] || '-'

            const offered = metric.offered ?? ''
            const registered = metric.registered ?? ''
            const enqueued = metric.enqueued ?? ''
            const total = metric.total ?? ''
            const limit = metric.limit ?? ''
            const utilization = metric.utilization_pct != null ? `${metric.utilization_pct}%` : ''
            const schedulingRate = metric.scheduling_rate_pct != null
                ? `${metric.scheduling_rate_approx ? '~' : ''}${metric.scheduling_rate_pct}%`
                : ''

            const additionalFields = Array.from(allKeys).map(key => {
                const value = metric[key]
                if (value === null || value === undefined) return ''
                if (typeof value === 'object') {
                    return JSON.stringify(value)
                }
                return String(value)
            })

            return [
                queueName,
                date,
                timeSlot,
                callbackType,
                String(offered),
                String(registered),
                String(enqueued),
                String(total),
                String(limit),
                String(metric.rejection_count ?? ''),
                utilization,
                schedulingRate,
                ...additionalFields
            ]
        })

        // Escape CSV values (handle commas, quotes, newlines)
        const escapeCSV = (value: string): string => {
            if (value === null || value === undefined) return ''
            const stringValue = String(value)
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`
            }
            return stringValue
        }

        // Combine headers and rows
        const csvContent = [
            headers.map(escapeCSV).join(','),
            ...rows.map(row => row.map(escapeCSV).join(','))
        ].join('\n')

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        // Generate filename with filters
        const queuePart = selectedQueue ? `_${selectedQueue.replace(/[^a-zA-Z0-9]/g, '_')}` : ''
        const datePart = selectedDate ? `_${selectedDate}` : ''
        const callbackTypePart = selectedCallbackType ? `_${selectedCallbackType.replace(/[^a-zA-Z0-9]/g, '_')}` : ''
        const filename = `concurrency_metrics${queuePart}${datePart}${callbackTypePart}_${new Date().toISOString().split('T')[0]}.csv`

        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const metrics = data?.items || []

    // --- Data pipeline: unique types → filter → sort ---
    const uniqueCallbackTypes = useMemo(() => {
        const types = new Set(metrics.map((m: any) =>
            m.callback_type || m.time_slot_callback_type?.split('#')[1] || ''
        ).filter(Boolean))
        return Array.from(types).sort() as string[]
    }, [metrics])

    const filteredMetrics = useMemo(() => {
        if (!selectedCallbackType) return metrics
        return metrics.filter((m: any) => {
            const type = m.callback_type || m.time_slot_callback_type?.split('#')[1] || ''
            return type === selectedCallbackType
        })
    }, [metrics, selectedCallbackType])

    const sortedMetrics = useMemo(() => {
        if (!sortState.column || !sortState.direction) return filteredMetrics
        return [...filteredMetrics].sort((a: any, b: any) => {
            const valA = getValueForColumn(a, sortState.column!)
            const valB = getValueForColumn(b, sortState.column!)
            const cmp = compareValues(valA, valB)
            return sortState.direction === 'asc' ? cmp : -cmp
        })
    }, [filteredMetrics, sortState])

    return (
        <PageLayout title={t({ id: 'concurrencyMetrics.title' })}>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                {t({ id: 'concurrencyMetrics.pageTtitle' })}
                            </CardTitle>
                            <CardDescription>
                                {t({ id: 'concurrencyMetrics.description' })}
                            </CardDescription>
                        </div>
                        {metrics.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToCSV}
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                {t({ id: 'concurrencyMetrics.downloadCSV' })}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
                        <div className="space-y-2">
                            <Label htmlFor="queue-filter">{t({ id: 'concurrencyMetrics.filterByQueue' })}</Label>
                            <Select value={selectedQueue || ""} onValueChange={(value) => setSelectedQueue(value === "all" ? undefined : value)}>
                                <SelectTrigger id="queue-filter">
                                    <SelectValue placeholder={t({ id: 'concurrencyMetrics.allQueues' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t({ id: 'concurrencyMetrics.allQueues' })}</SelectItem>
                                    {queues.map((queue) => (
                                        <SelectItem key={queue.id} value={queue.name}>
                                            {queue.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date-filter">{t({ id: 'concurrencyMetrics.filterByDate' })}</Label>
                            <Input
                                id="date-filter"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="callback-type-filter">{t({ id: 'concurrencyMetrics.filterByCallbackType' })}</Label>
                            <Select value={selectedCallbackType || ""} onValueChange={(value) => setSelectedCallbackType(value === "all" ? undefined : value)}>
                                <SelectTrigger id="callback-type-filter">
                                    <SelectValue placeholder={t({ id: 'concurrencyMetrics.allCallbackTypes' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t({ id: 'concurrencyMetrics.allCallbackTypes' })}</SelectItem>
                                    {uniqueCallbackTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button variant="default" onClick={handleClearFilters} className="w-full">
                                {t({ id: 'common.clear' })}
                            </Button>
                        </div>
                    </div>

                    {/* Results */}
                    {isLoading || isLoadingQueues ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2">{t({ id: 'common.loading' })}</span>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center text-destructive">
                            {error instanceof Error ? error.message : t({ id: 'concurrencyMetrics.error.loading' })}
                        </div>
                    ) : metrics.length === 0 ? (
                        <div className="rounded-lg border p-4 text-center text-muted-foreground">
                            {t({ id: 'concurrencyMetrics.noData' })}
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 text-sm text-muted-foreground">
                                {selectedCallbackType
                                    ? t({ id: 'concurrencyMetrics.showingResults' }, { count: sortedMetrics.length, total: metrics.length })
                                    : t({ id: 'concurrencyMetrics.showingResults' }, { count: metrics.length, total: data?.count || 0 })}
                            </div>
                            <div className="rounded-md border">
                                <Table containerClassName="h-[1024px] overflow-y-auto">
                                    <TableHeader className="sticky top-0 z-10 bg-background [&_th]:bg-background">
                                        <TableRow>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('queue_name')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.queueName' })}
                                                    {sortState.column === 'queue_name' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'queue_name' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('date')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.date' })}
                                                    {sortState.column === 'date' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'date' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('time_slot')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.timeSlot' })}
                                                    {sortState.column === 'time_slot' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'time_slot' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('callback_type')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.callbackType' })}
                                                    {sortState.column === 'callback_type' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'callback_type' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            {/* Outcome columns (per slot) */}
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('offered')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.offered' })}
                                                    {sortState.column === 'offered' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'offered' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('registered')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.registered' })}
                                                    {sortState.column === 'registered' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'registered' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('enqueued')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.enqueued' })}
                                                    {sortState.column === 'enqueued' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'enqueued' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('total')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.total' })}
                                                    {sortState.column === 'total' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'total' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('limit')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.limit' })}
                                                    {sortState.column === 'limit' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'limit' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('rejection_count')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.rejectionCount' })}
                                                    {sortState.column === 'rejection_count' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'rejection_count' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('utilization_pct')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.utilization' })}
                                                    {sortState.column === 'utilization_pct' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'utilization_pct' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('scheduling_rate_pct')}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: 'concurrencyMetrics.schedulingRate' })}
                                                    {sortState.column === 'scheduling_rate_pct' && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                    {sortState.column === 'scheduling_rate_pct' && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                </div>
                                            </TableHead>
                                            {/* Dynamic columns for additional fields */}
                                            {metrics.length > 0 && Object.keys(metrics[0])
                                                .filter(key => !['queue_name_date', 'time_slot_callback_type', 'queue_name', 'date', 'time_slot', 'callback_type', 'offered', 'registered', 'enqueued', 'total', 'limit', 'utilization_pct', 'scheduling_rate_pct', 'scheduling_rate_approx', 'rejection_count'].includes(key))
                                                .map((key) => (
                                                    <TableHead key={key} className="cursor-pointer select-none" onClick={() => handleSort(key)}>
                                                        <div className="flex items-center gap-1">
                                                            {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                                            {sortState.column === key && sortState.direction === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                            {sortState.column === key && sortState.direction === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                        </div>
                                                    </TableHead>
                                                ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedMetrics.map((metric, index) => (
                                            <TableRow key={`${metric.queue_name_date}-${metric.time_slot_callback_type}-${index}`}>
                                                <TableCell>{metric.queue_name || metric.queue_name_date?.split('#')[0] || '-'}</TableCell>
                                                <TableCell>{metric.date || metric.queue_name_date?.split('#')[1] || '-'}</TableCell>
                                                <TableCell>{metric.time_slot || metric.time_slot_callback_type?.split('#')[0] || '-'}</TableCell>
                                                <TableCell>{metric.callback_type || metric.time_slot_callback_type?.split('#')[1] || '-'}</TableCell>
                                                {/* Outcome cells (per slot) */}
                                                <TableCell>{metric.offered ?? '-'}</TableCell>
                                                <TableCell>{metric.registered ?? '-'}</TableCell>
                                                <TableCell>{metric.enqueued ?? '-'}</TableCell>
                                                <TableCell>{metric.total ?? '-'}</TableCell>
                                                <TableCell>{metric.limit ?? '-'}</TableCell>
                                                <TableCell>{metric.rejection_count ?? '-'}</TableCell>
                                                <TableCell>{metric.utilization_pct != null ? `${metric.utilization_pct}%` : '-'}</TableCell>
                                                <TableCell>
                                                    {metric.scheduling_rate_pct != null
                                                        ? (metric.scheduling_rate_approx
                                                            ? <span title={t({ id: 'concurrencyMetrics.schedulingRateApproxHint' })}>~{metric.scheduling_rate_pct}%</span>
                                                            : `${metric.scheduling_rate_pct}%`)
                                                        : '-'}
                                                </TableCell>
                                                {/* Dynamic cells for additional fields */}
                                                {Object.keys(metric)
                                                    .filter(key => !['queue_name_date', 'time_slot_callback_type', 'queue_name', 'date', 'time_slot', 'callback_type', 'offered', 'registered', 'enqueued', 'total', 'limit', 'utilization_pct', 'scheduling_rate_pct', 'scheduling_rate_approx', 'rejection_count'].includes(key))
                                                    .map((key) => (
                                                        <TableCell key={key}>
                                                            {typeof metric[key] === 'object'
                                                                ? JSON.stringify(metric[key])
                                                                : String(metric[key] ?? '-')}
                                                        </TableCell>
                                                    ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </PageLayout>
    )
}

