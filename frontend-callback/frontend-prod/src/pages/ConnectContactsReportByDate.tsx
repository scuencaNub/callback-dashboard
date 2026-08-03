import { AlertCircle, Download, Loader2, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { getIdToken } from "../lib/auth-helpers"
import { useIntl } from "react-intl"
import { PageLayout } from "../components/pageLayout"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { config } from "../config/env"
import { useGetReportRows } from "../hooks/queries/useGetReportRows"
import { useGetReports } from "../hooks/queries/useGetReports"
import type { CallbackHistoryItem } from "../hooks/queries/useQueryConnectContacts"
import { useQueryReportByDate } from "../hooks/queries/useQueryReportByDate"
import { useQueues } from "../hooks/queries/useQueues"
import { formatTimestampKey, getTimestampOrder } from "../lib/callbackTimestamp"
import { buildCsvString } from "../lib/csvUtils"
import { getStatusColor } from "../lib/getStatusColor"
import { getStatusIcon } from "../lib/getStatusIcon.tsx"

const MAX_DATE_RANGE_MONTHS = 4

const addMonths = (value: Date, months: number) => {
    const next = new Date(value)
    next.setMonth(next.getMonth() + months)
    return next
}

export default function ConnectContactsReportByDate() {
    const { formatMessage: t } = useIntl()
    const [phoneNumbers, setPhoneNumbers] = useState<string>("")
    const [startDate, setStartDate] = useState<string>("")
    const [endDate, setEndDate] = useState<string>("")
    const [selectedCallback, setSelectedCallback] = useState<CallbackHistoryItem | null>(null)
    const [items, setItems] = useState<CallbackHistoryItem[]>([])
    const [isExporting, setIsExporting] = useState(false)
    const [selectedType, setSelectedType] = useState<string>("todos")
    const [selectedStatus, setSelectedStatus] = useState<string>("todos")
    const [selectedQueue, setSelectedQueue] = useState<string>("todas")
    const [reportJob, setReportJob] = useState<{ reportId: string; status: string } | null>(null)
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
    const [rowsPage, setRowsPage] = useState<number>(1)
    const rowsPageSize = 50

    const { data: queues = [], isLoading: isLoadingQueues } = useQueues()
    const reportsQuery = useGetReports()
    const reportRowsQuery = useGetReportRows(selectedReportId, rowsPage, rowsPageSize)

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const matchesType = selectedType === "todos" || item.callback_type === selectedType
            const matchesStatus = selectedStatus === "todos" || item.status === selectedStatus
            const matchesQueue = selectedQueue === "todas" || (item.queue_name || "") === selectedQueue
            return matchesType && matchesStatus && matchesQueue
        })
    }, [items, selectedType, selectedStatus, selectedQueue])

    const yesterday = (() => {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        return d.toISOString().split('T')[0]
    })()

    const maxEndDate = yesterday

    const queryMutation = useQueryReportByDate()

    const handleSearch = () => {
        setReportJob(null)

        const phoneList = phoneNumbers
            .split(/[,\n]/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0)

        if (!startDate || !endDate) {
            alert(t({ id: 'connectContacts.error.datesRequired' }))
            return
        }

        const start = new Date(startDate)
        const end = new Date(endDate)

        if (start > end) {
            alert(t({ id: 'connectContacts.error.invalidDateRange' }))
            return
        }
        const maxAllowedEnd = addMonths(start, MAX_DATE_RANGE_MONTHS)
        if (end > maxAllowedEnd) {
            alert("Date range exceeded. Maximum allowed range is 4 months.")
            return
        }

        queryMutation.mutate(
            {
                ...(phoneList.length > 0 ? { phone_numbers: phoneList } : {}),
                start_date: `${startDate} 00:00:00`,
                end_date: `${endDate} 23:59:59`,
            },
            {
                onSuccess: (data) => {
                    if (data.reportId) {
                        setItems([])
                        setReportJob({
                            reportId: data.reportId,
                            status: data.status || "PENDING",
                        })
                    } else {
                        setItems(data.items || [])
                    }
                    setSelectedType("todos")
                    setSelectedStatus("todos")
                    setSelectedQueue("todas")
                },
            }
        )
    }

    const openTimestampView = (callback: CallbackHistoryItem) => {
        setSelectedCallback(callback)
    }

    const buildCSVFromItems = (allItems: CallbackHistoryItem[]) => {
        const headers = [
            'ID', 'Phone', 'Queue', 'Callback Type', 'Status', 'Registration Time', 'Retry 1',
            'Scheduled Date', 'Attempts', 'Agent', 'Queue ID', 'Contact Flow ID', 'Outbound Phone',
            'Agent ID', 'Contact ID Outbound', 'Retry Attempt Interval',
            'CB_REGISTERED', 'CB retry 1', 'CB retry 2', 'CB retry 3', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'FAILED'
        ]
        const rows = allItems.map((item) => [
            item.contact_id_inbound || '',
            item.customer_phone_number || '',
            item.queue_name || '',
            item.callback_type || '',
            item.status || '',
            item.cb_registered ?? '',
            item.cb_retry_1 ?? '',
            item.call_at ?? '',
            item.retries?.toString() ?? '0',
            item.agent_name ?? '',
            item.queue_id ?? '',
            item.contact_flow_id ?? '',
            item.outbound_phone_number ?? '',
            item.agent_id ?? '',
            item.contact_id_outbound ?? '',
            item.retry_attempt_interval?.toString() ?? '',
            item.cb_registered ?? '',
            item.cb_retry_1 ?? '',
            item.cb_retry_2 ?? '',
            item.cb_retry_3 ?? '',
            item.completed ?? '',
            item.cancelled ?? '',
            item.rescheduled ?? '',
            item.failed ?? ''
        ])
        return buildCsvString(headers, rows)
    }

    const exportToCSV = () => {
        if (!startDate || !endDate || filteredItems.length === 0) return
        setIsExporting(true)
        try {
            const csvContent = buildCSVFromItems(filteredItems)
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `callbacks_${startDate}_to_${endDate}_${new Date().toISOString().split('T')[0]}.csv`
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(link.href)
        } finally {
            setIsExporting(false)
        }
    }

    const formatDateTime = (value: string | null | undefined) => {
        if (!value) return "-"

        // Supports ISO (createdAt/finishedAt) and 'YYYY-MM-DD HH:MM:SS' (params).
        const isoLike = value.includes("T") ? value : value.replace(" ", "T")
        const parsed = new Date(isoLike)
        if (Number.isNaN(parsed.getTime())) return value

        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        }).format(parsed)
    }

    const formatReportColumnHeader = (key: string) => {
        const normalized = (key || "").trim()
        if (!normalized) return ""

        const friendlyMap: Record<string, string> = {
            contact_id_inbound: "Inbound contact ID",
            contact_id_outbound: "Outbound contact ID",
            contact_flow_id: "Contact flow ID",
            flow_arn: "Flow ARN",
            queue_id: "Queue ID",
            queue_name: "Queue",
            agent_name: "Agent",
            customer_phone_number: "Phone",
            outbound_phone_number: "Outbound phone",
            callback_type: "Callback type",
            call_at: "Scheduled date",
            retries: "Retries",
            retry_attempt_interval: "Retry interval",
            status: "Status",
            cb_registered: "Registration time",
            cb_retry_1: "Retry 1",
            cb_retry_2: "Retry 2",
            cb_retry_3: "Retry 3",
            completed: "Completed",
            cancelled: "Cancelled",
            rescheduled: "Rescheduled",
            failed: "Failed",
        }

        if (friendlyMap[normalized]) return friendlyMap[normalized]

        // Generic fallback: snake_case -> Title Case
        return normalized
            .replace(/[_\-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\b\w/g, (c) => c.toUpperCase())
    }

    const formatCount = (value: number | null | undefined) => {
        if (value == null) return "-"
        if (Number.isNaN(value)) return "-"
        return new Intl.NumberFormat(undefined).format(value)
    }

    return (
        <PageLayout title={t({ id: 'connectContacts.reportByDateTitle' })}>
            <div className="space-y-6">
                {/* Search Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t({ id: 'connectContacts.searchReportByDateTitle' })}</CardTitle>
                        <CardDescription>{t({ id: 'connectContacts.searchDescription' })}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone-numbers">{t({ id: 'connectContacts.phoneNumber' })}</Label>
                            <Input
                                id="phone-numbers"
                                placeholder={t({ id: 'connectContacts.phoneNumberPlaceholder' })}
                                value={phoneNumbers}
                                onChange={(e) => setPhoneNumbers(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t({ id: 'connectContacts.reportByDate.phoneNumberHelp' })}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start-date">{t({ id: 'connectContacts.startDate' })}</Label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    max={yesterday}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-date">{t({ id: 'connectContacts.endDate' })}</Label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    max={maxEndDate}
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleSearch}
                            disabled={queryMutation.isPending}
                            className="w-full md:w-auto"
                        >
                            {queryMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t({ id: 'connectContacts.searching' })}
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    {t({ id: 'connectContacts.search' })}
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Error Message */}
                {queryMutation.isError && (
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-destructive">
                                <AlertCircle className="h-5 w-5" />
                                <span>
                                    {queryMutation.error instanceof Error
                                        ? queryMutation.error.message
                                        : t({ id: 'connectContacts.error.generic' })}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Async Job Notification */}
                {reportJob && (
                    <Card className="border-primary/40">
                        <CardContent className="pt-6">
                            <div className="space-y-1">
                                <p className="font-medium">
                                    Report job started successfully.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Status: {reportJob.status} | Report ID: {reportJob.reportId}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* My Reports */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>My reports</CardTitle>
                                <CardDescription>
                                    Reports requested by the logged-in user (auto refresh each 60s)
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => reportsQuery.refetch()}
                                disabled={reportsQuery.isFetching}
                            >
                                {reportsQuery.isFetching ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Refreshing
                                    </>
                                ) : (
                                    "Refresh"
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {reportsQuery.isError ? (
                            <div className="text-sm text-destructive">
                                {reportsQuery.error instanceof Error ? reportsQuery.error.message : "Failed to load reports"}
                            </div>
                        ) : reportsQuery.isLoading ? (
                            <div className="text-sm text-muted-foreground">Loading reports...</div>
                        ) : (reportsQuery.data?.items?.length || 0) === 0 ? (
                            <div className="text-sm text-muted-foreground">No reports found for this user.</div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Start</TableHead>
                                            <TableHead>End</TableHead>
                                            <TableHead>Rows</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead>Finished</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(reportsQuery.data?.items || []).map((report) => (
                                            <TableRow
                                                key={report.reportId}
                                                className={selectedReportId === report.reportId ? "bg-muted/40" : ""}
                                                onClick={() => {
                                                    setSelectedReportId(report.reportId)
                                                    setRowsPage(1)
                                                }}
                                            >
                                                <TableCell>{report.status || "-"}</TableCell>
                                                <TableCell>{formatDateTime(report.params?.start_date)}</TableCell>
                                                <TableCell>{formatDateTime(report.params?.end_date)}</TableCell>
                                                <TableCell>{formatCount(report.totalRowCount)}</TableCell>
                                                <TableCell>{formatDateTime(report.createdAt)}</TableCell>
                                                <TableCell>{formatDateTime(report.finishedAt)}</TableCell>
                                                <TableCell>
                                                    {report.status === "SUCCEEDED" ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={async (e) => {
                                                                e.stopPropagation()
                                                                try {
                                                                        const idToken = await getIdToken()

                                                                    const response = await fetch(
                                                                        `${config.reportsUrl}/${encodeURIComponent(report.reportId)}/download`,
                                                                            {
                                                                                method: "GET",
                                                                                headers: {
                                                                                    Authorization: `Bearer ${idToken}`,
                                                                                    "Content-Type": "application/json",
                                                                                },
                                                                            },
                                                                    )
                                                                    if (!response.ok) {
                                                                        const errorData = await response.json().catch(() => ({}))
                                                                        throw new Error(
                                                                            errorData.error ||
                                                                            errorData.message ||
                                                                            `HTTP error! status: ${response.status}`,
                                                                        )
                                                                    }
                                                                    const data = await response.json()
                                                                    const url = typeof data.body === "string"
                                                                        ? JSON.parse(data.body).url
                                                                        : (data.body?.url ?? data.url)
                                                                    if (url) {
                                                                        window.open(url, "_blank")
                                                                    }
                                                                } catch (err) {
                                                                    console.error("Failed to download report", err)
                                                                }
                                                            }}
                                                        >
                                                            Download CSV
                                                        </Button>
                                                    ) : null}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Selected report rows */}
                {selectedReportId && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Report rows</CardTitle>
                                    <CardDescription>
                                        Page {reportRowsQuery.data?.page ?? rowsPage}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedReportId(null)}
                                    >
                                        Clear
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={reportRowsQuery.isFetching}
                                        onClick={() => reportRowsQuery.refetch()}
                                    >
                                        {reportRowsQuery.isFetching ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Refresh
                                            </>
                                        ) : (
                                            "Refresh"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {reportRowsQuery.isError ? (
                                <div className="text-sm text-destructive">
                                    {reportRowsQuery.error instanceof Error
                                        ? reportRowsQuery.error.message
                                        : "Failed to load report rows"}
                                </div>
                            ) : reportRowsQuery.isLoading ? (
                                <div className="text-sm text-muted-foreground">Loading rows...</div>
                            ) : !reportRowsQuery.data || ((reportRowsQuery.data as any).rows || []).length === 0 ? (
                                <div className="text-sm text-muted-foreground">No rows found for this report.</div>
                            ) : (
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                (() => {
                                    const data = reportRowsQuery.data as any
                                    const rows = data.rows as any[]
                                    const headers = Object.keys(rows[0] || {})
                                    const totalRows = data.totalRows as number | undefined
                                    const currentPage = data.page as number | undefined

                                    return (
                                        <>
                                            <div className="rounded-md border mb-3">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            {headers.map((key) => (
                                                                <TableHead key={key}>{formatReportColumnHeader(key)}</TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {rows.map((row, idx) => (
                                                            <TableRow key={idx}>
                                                                {headers.map((key) => (
                                                                    <TableCell key={key}>{(row as any)[key] ?? "-"}</TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                <span>
                                                    Page {currentPage ?? rowsPage}{" "}
                                                    {totalRows != null && (
                                                        <>of {Math.ceil(totalRows / rowsPageSize)}</>
                                                    )}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={rowsPage <= 1 || reportRowsQuery.isFetching}
                                                        onClick={() => setRowsPage((p) => Math.max(1, p - 1))}
                                                    >
                                                        Previous
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={
                                                            reportRowsQuery.isFetching ||
                                                            (totalRows != null &&
                                                                (currentPage ?? rowsPage) * rowsPageSize >= totalRows)
                                                        }
                                                        onClick={() => setRowsPage((p) => p + 1)}
                                                    >
                                                        Next
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    )
                                })()
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Results */}
                {(items.length > 0 || (queryMutation.isSuccess && !reportJob)) && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>
                                        {t({ id: 'connectContacts.results' })} ({filteredItems.length}{items.length !== filteredItems.length ? ` / ${items.length}` : ''})
                                    </CardTitle>
                                    <CardDescription>
                                        {t({ id: 'connectContacts.resultsDescription' })}
                                    </CardDescription>
                                </div>
                                {items.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={exportToCSV}
                                        disabled={isExporting || filteredItems.length === 0}
                                        className="flex items-center gap-2"
                                    >
                                        {isExporting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                {t({ id: 'connectContacts.exporting' })}
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4" />
                                                {t({ id: 'connectContacts.downloadCSV' })}
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                            {items.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <Select value={selectedType} onValueChange={setSelectedType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t({ id: 'callbacks.callbackType' })} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todos">All types</SelectItem>
                                            <SelectItem value="ASAP">ASAP</SelectItem>
                                            <SelectItem value="SCHEDULE">SCHEDULE</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t({ id: 'callbacks.filterByStatus' })} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todos">{t({ id: 'callbacks.allStatuses' })}</SelectItem>
                                            <SelectItem value="PENDING">{t({ id: 'status.pending' })}</SelectItem>
                                            <SelectItem value="IN_PROGRESS">{t({ id: 'status.inProgress' })}</SelectItem>
                                            <SelectItem value="COMPLETED">{t({ id: 'status.completed' })}</SelectItem>
                                            <SelectItem value="FAILED">{t({ id: 'status.failed' })}</SelectItem>
                                            <SelectItem value="CANCELLED">{t({ id: 'status.cancelled' })}</SelectItem>
                                            <SelectItem value="RESCHEDULED">{t({ id: 'status.rescheduled' })}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedQueue} onValueChange={setSelectedQueue}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t({ id: 'callbacks.filterByQueue' })} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todas">{t({ id: 'callbacks.allQueues' })}</SelectItem>
                                            {isLoadingQueues ? (
                                                <SelectItem value="todas" disabled>{t({ id: 'common.loading' })}</SelectItem>
                                            ) : (
                                                queues.sort((a, b) => a.name.localeCompare(b.name)).map((queue) => (
                                                    <SelectItem key={queue.name} value={queue.name}>{queue.name}</SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            {items.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {t({ id: 'connectContacts.reportByDate.noResults' })}
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {t({ id: 'callbacks.noCallbacksFound' })}
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t({ id: 'callbacks.id' })}</TableHead>
                                                <TableHead>{t({ id: 'callbacks.phone' })}</TableHead>
                                                <TableHead>{t({ id: 'callbacks.queue' })}</TableHead>
                                                <TableHead>{t({ id: 'callbacks.callbackType' })}</TableHead>
                                                <TableHead>{t({ id: 'callbacks.status' })}</TableHead>
                                                <TableHead>{t({ id: 'callbacks.timeOfRegistration' })}</TableHead>
                                                <TableHead>{t({ id: 'callbacks.retry' })}</TableHead>
                                                <TableHead>{t({ id: 'callbacks.scheduledDate' })}</TableHead>
                                                <TableHead>{t({ id: 'callbacks.nextTimeToCall' })}</TableHead>
                                                <TableHead>{t({ id: 'callbacks.attempts' })}</TableHead>
                                                <TableHead>{t({ id: 'callbacks.agent' })}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredItems.map((item) => {
                                                const isSchedule = item.callback_type === "SCHEDULE";
                                                return (
                                                    <TableRow key={item.contact_id_inbound}>
                                                        <TableCell className="font-medium">{item.contact_id_inbound}</TableCell>
                                                        <TableCell>{item.customer_phone_number}</TableCell>
                                                        <TableCell>{item.queue_name || '-'}</TableCell>
                                                        <TableCell>{item.callback_type || '-'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`flex items-center gap-1 ${getStatusColor(item.status)}`}>
                                                                {getStatusIcon(item.status)}
                                                                <span className="capitalize whitespace-nowrap">
                                                                    {item.status === "PENDING"
                                                                        ? t({ id: 'status.pending' })
                                                                        : item.status === "IN_PROGRESS"
                                                                            ? t({ id: 'status.inProgress' })
                                                                            : item.status === "COMPLETED"
                                                                                ? t({ id: 'status.completed' })
                                                                                : item.status === "FAILED"
                                                                                    ? t({ id: 'status.failed' })
                                                                                    : item.status === "CANCELLED"
                                                                                        ? t({ id: 'status.cancelled' })
                                                                                        : item.status === "RESCHEDULED"
                                                                                            ? t({ id: 'status.rescheduled' })
                                                                                            : (item.status ? item.status.replace("_", " ") : "-")}
                                                                </span>
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.cb_registered
                                                                ? formatDateTime(item.cb_registered)
                                                                : "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.cb_retry_1
                                                                ? formatDateTime(item.cb_retry_1)
                                                                : "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {isSchedule ? formatDateTime(item.call_at) : "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {isSchedule ? "-" : formatDateTime(item.call_at)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="link"
                                                                className="h-auto p-0 font-medium text-primary hover:underline"
                                                                onClick={() => openTimestampView(item)}
                                                            >
                                                                {item.retries || 0}
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell>{item.agent_name || "-"}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Timestamp Details Dialog (flat fields: cb_registered, cb_retry_1, etc.) */}
                <AlertDialog open={selectedCallback !== null} onOpenChange={(open) => !open && setSelectedCallback(null)}>
                    <AlertDialogContent className="max-w-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {t({ id: 'callbacks.timestampDetails' })} - {selectedCallback?.contact_id_inbound}
                            </AlertDialogTitle>
                        </AlertDialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto">
                            {selectedCallback ? (
                                (() => {
                                    const flatEntries: [string, string][] = [
                                        ["cb_registered", selectedCallback.cb_registered ?? ""],
                                        ["cb_retry_1", selectedCallback.cb_retry_1 ?? ""],
                                        ["cb_retry_2", selectedCallback.cb_retry_2 ?? ""],
                                        ["cb_retry_3", selectedCallback.cb_retry_3 ?? ""],
                                        ["completed", selectedCallback.completed ?? ""],
                                        ["cancelled", selectedCallback.cancelled ?? ""],
                                        ["rescheduled", selectedCallback.rescheduled ?? ""],
                                        ["failed", selectedCallback.failed ?? ""],
                                    ]
                                    const timestampEntries = flatEntries
                                        .filter(([_, value]) => value != null && value !== "")
                                        .sort(([keyA], [keyB]) => {
                                            const orderA = getTimestampOrder(keyA)
                                            const orderB = getTimestampOrder(keyB)
                                            return orderA - orderB
                                        })

                                    return timestampEntries.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Event</TableHead>
                                                    <TableHead>Date/Time</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {timestampEntries.map(([key, value]) => (
                                                    <TableRow key={key}>
                                                        <TableCell>{formatTimestampKey(key, t)}</TableCell>
                                                        <TableCell>{formatDateTime(value)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No timestamp data available for this callback.</p>
                                    )
                                })()
                            ) : (
                                <p className="text-sm text-muted-foreground">No timestamp data available for this callback.</p>
                            )}
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t({ id: 'common.close' })}</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </PageLayout>
    )
}

