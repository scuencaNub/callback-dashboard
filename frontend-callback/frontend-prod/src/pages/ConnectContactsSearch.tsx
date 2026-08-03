import { AlertCircle, Download, Loader2, Search } from "lucide-react"
import { useRef, useState } from "react"
import { useIntl } from "react-intl"
import { PageLayout } from "../components/pageLayout"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import type { CallbackHistoryItem } from "../hooks/queries/useQueryConnectContacts"
import { fetchAllCallbackHistoryPages, useQueryConnectContacts } from "../hooks/queries/useQueryConnectContacts"
import { formatTimestampKey, getTimestampOrder } from "../lib/callbackTimestamp"
import { buildCsvString } from "../lib/csvUtils"
import { formatDateTime } from "../lib/formatDateTime"
import { getStatusColor } from "../lib/getStatusColor"
import { getStatusIcon } from "../lib/getStatusIcon.tsx"

const PAGE_SIZE = 500

export default function ConnectContactsSearch() {
    const { formatMessage: t } = useIntl()
    const [phoneNumbers, setPhoneNumbers] = useState<string>("")
    const [startDate, setStartDate] = useState<string>("")
    const [endDate, setEndDate] = useState<string>("")
    const [selectedCallback, setSelectedCallback] = useState<CallbackHistoryItem | null>(null)
    const [items, setItems] = useState<CallbackHistoryItem[]>([])
    const [nextPageToken, setNextPageToken] = useState<string | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const lastSearchParamsRef = useRef<{ phone_numbers: string[]; start_date: string; end_date: string } | null>(null)
    const isLoadMoreRef = useRef(false)

    const queryMutation = useQueryConnectContacts()

    const handleSearch = () => {
        const phoneList = phoneNumbers
            .split(/[,\n]/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0)

        if (phoneList.length === 0) {
            alert(t({ id: 'connectContacts.error.phoneRequired' }))
            return
        }

        if (!startDate || !endDate) {
            alert(t({ id: 'connectContacts.error.datesRequired' }))
            return
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert(t({ id: 'connectContacts.error.invalidDateRange' }))
            return
        }

        isLoadMoreRef.current = false
        lastSearchParamsRef.current = { phone_numbers: phoneList, start_date: startDate, end_date: endDate }
        queryMutation.mutate(
            {
                phone_numbers: phoneList,
                start_date: startDate,
                end_date: endDate,
                page_size: PAGE_SIZE,
            },
            {
                onSuccess: (data) => {
                    setItems(data.items)
                    setNextPageToken(data.next_page_token ?? null)
                },
            }
        )
    }

    const handleLoadMore = () => {
        const params = lastSearchParamsRef.current
        if (!params || !nextPageToken) return
        isLoadMoreRef.current = true
        queryMutation.mutate(
            {
                ...params,
                page_size: PAGE_SIZE,
                next_page_token: nextPageToken,
            },
            {
                onSuccess: (data) => {
                    setItems((prev) => [...prev, ...data.items])
                    setNextPageToken(data.next_page_token ?? null)
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
        const formatDate = (dateStr?: string) => {
            if (!dateStr) return ''
            try { return formatDateTime(dateStr) } catch { return dateStr }
        }
        const rows = allItems.map((item) => [
            item.contact_id_inbound || '',
            item.customer_phone_number || '',
            item.queue_name || '',
            item.callback_type || '',
            item.status || '',
            formatDate(item.timestamp?.["CB_REGISTERED"] || item.timestamp?.["CB REGISTERED"]),
            formatDate(item.timestamp?.["CB retry 1"] || item.timestamp?.["CB_retry 1"]),
            formatDate(item.call_at),
            item.retries?.toString() || '0',
            item.agent_name || '',
            item.queue_id || '',
            item.contact_flow_id || '',
            item.outbound_phone_number || '',
            item.agent_id || '',
            item.contact_id_outbound || '',
            item.retry_attempt_interval?.toString() || '',
            formatDate(item.timestamp?.["CB_REGISTERED"] || item.timestamp?.["CB REGISTERED"]),
            formatDate(item.timestamp?.["CB retry 1"] || item.timestamp?.["CB_retry 1"]),
            formatDate(item.timestamp?.["CB retry 2"]),
            formatDate(item.timestamp?.["CB retry 3"]),
            formatDate(item.timestamp?.["COMPLETED"]),
            formatDate(item.timestamp?.["CANCELLED"]),
            formatDate(item.timestamp?.["RESCHEDULED"]),
            formatDate(item.timestamp?.["FAILED"])
        ])
        return buildCsvString(headers, rows)
    }

    const exportToCSV = async () => {
        const params = lastSearchParamsRef.current
        if (!params || !startDate || !endDate) return
        setIsExporting(true)
        try {
            const allItems = await fetchAllCallbackHistoryPages({
                phone_numbers: params.phone_numbers,
                start_date: params.start_date,
                end_date: params.end_date,
                page_size: PAGE_SIZE,
            })
            if (allItems.length === 0) {
                return
            }
            const csvContent = buildCSVFromItems(allItems)
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `callbacks_${startDate}_to_${endDate}_${new Date().toISOString().split('T')[0]}.csv`
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(link.href)
        } catch (err) {
            alert(err instanceof Error ? err.message : t({ id: 'connectContacts.error.generic' }))
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <PageLayout title={t({ id: 'connectContacts.title' })}>
            <div className="space-y-6">
                {/* Search Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t({ id: 'connectContacts.searchTitle' })}</CardTitle>
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
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleSearch()
                                    }
                                }}
                            />
                            <p className="text-sm text-muted-foreground">
                                {t({ id: 'connectContacts.phoneNumberHelp' })}
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
                                    max={new Date().toISOString().split('T')[0]}
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
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleSearch}
                            disabled={queryMutation.isPending}
                            className="w-full md:w-auto"
                        >
                            {queryMutation.isPending && !isLoadMoreRef.current ? (
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

                {/* Results: show when we have items or last request succeeded (so list stays visible during Load more) */}
                {(items.length > 0 || queryMutation.isSuccess) && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>
                                        {t({ id: 'connectContacts.results' })} (
                                        {nextPageToken ? `${items.length}+` : items.length}
                                        )
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
                                        disabled={isExporting}
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
                        </CardHeader>
                        <CardContent>
                            {items.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {t({ id: 'connectContacts.noResults' })}
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
                                            {items.map((item) => {
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
                                                                                            : item.status.replace("_", " ")}
                                                                </span>
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.timestamp?.["CB_REGISTERED"] || item.timestamp?.["CB REGISTERED"]
                                                                ? formatDateTime(item.timestamp["CB_REGISTERED"] || item.timestamp["CB REGISTERED"])
                                                                : "-"}
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.timestamp?.["CB retry 1"] || item.timestamp?.["CB_retry 1"]
                                                                ? formatDateTime(item.timestamp["CB retry 1"] || item.timestamp["CB_retry 1"])
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
                            {items.length > 0 && nextPageToken && (
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        variant="outline"
                                        onClick={handleLoadMore}
                                        disabled={queryMutation.isPending}
                                    >
                                        {queryMutation.isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {t({ id: 'connectContacts.loading' })}
                                            </>
                                        ) : (
                                            t({ id: 'connectContacts.loadMore' })
                                        )}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Timestamp Details Dialog */}
                <AlertDialog open={selectedCallback !== null} onOpenChange={(open) => !open && setSelectedCallback(null)}>
                    <AlertDialogContent className="max-w-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                {t({ id: 'callbacks.timestampDetails' })} - {selectedCallback?.contact_id_inbound}
                            </AlertDialogTitle>
                        </AlertDialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto">
                            {selectedCallback && selectedCallback.timestamp ? (
                                (() => {
                                    const timestampEntries = Object.entries(selectedCallback.timestamp)
                                        .filter(([_, value]) => value != null && value !== "")
                                        .sort(([keyA], [keyB]) => {
                                            const orderA = getTimestampOrder(keyA)
                                            const orderB = getTimestampOrder(keyB)
                                            if (orderA !== orderB) return orderA - orderB
                                            // Si tienen el mismo orden, ordenar por fecha
                                            const dateA = new Date(selectedCallback.timestamp![keyA]).getTime()
                                            const dateB = new Date(selectedCallback.timestamp![keyB]).getTime()
                                            return dateA - dateB
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
                                                        <TableCell>{formatDateTime(value as string)}</TableCell>
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

