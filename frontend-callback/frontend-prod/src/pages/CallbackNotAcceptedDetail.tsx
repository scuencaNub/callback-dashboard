import { ChevronDown, ChevronUp, Download, Loader2, XCircle } from "lucide-react"
import { useMemo, useState } from "react"
import { useIntl } from "react-intl"
import { PageLayout } from "../components/pageLayout"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { useCallbackNotAcceptedDetail } from "../hooks/queries/useCallbackNotAcceptedDetail"
import type { CallbackNotAcceptedDetailItem } from "../hooks/queries/useCallbackNotAcceptedDetail"
import { useQueues } from "../hooks/queries/useQueues"

// ─── helpers ───────────────────────────────────────────────────────────────────

/** formatea start_timestamp para display: "09:31:15" (hora PR, ya en -0400) */
function formatPrTime(ts: string): string {
    try {
        // ts: "2026-08-10T09:31:15-0400" → extraer solo HH:MM:SS
        const timePart = ts.split("T")[1] // "09:31:15-0400"
        return timePart.split("-")[0].split("+")[0] // "09:31:15"
    } catch {
        return ts
    }
}

/** extrae el slot de 15 min (HH:MM) de un start_timestamp PR */
function slotFromTimestamp(ts: string): string {
    try {
        // formato: 2026-08-10T09:31:15-0400
        const timePart = ts.split("T")[1] // "09:31:15-0400"
        const [hh, mm] = timePart.split(":")
        const slotMin = Math.floor(Number(mm) / 15) * 15
        return `${hh}:${String(slotMin).padStart(2, "0")}`
    } catch {
        return "??"
    }
}

interface SlotGroup {
    queue_name: string
    time_slot: string
    total: number
    enqueued: number
    cust_ended: number
    ewt_avg: number | null
    items: CallbackNotAcceptedDetailItem[]
}

// ─── component ─────────────────────────────────────────────────────────────────

export default function CallbackNotAcceptedDetail() {
    const { formatMessage: t } = useIntl()
    const [selectedQueue, setSelectedQueue] = useState<string | undefined>(undefined)
    const [selectedDate, setSelectedDate] = useState<string>(
        () => new Date().toISOString().split("T")[0]
    )
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [sortState, setSortState] = useState<{
        column: string | null
        direction: "asc" | "desc" | null
    }>({ column: null, direction: null })

    const { data: queues = [] } = useQueues()
    const { data, isLoading, error } = useCallbackNotAcceptedDetail(
        selectedDate || undefined,
        selectedQueue || undefined
    )

    const items = data?.items || []

    // ─── agregación por queue + slot ──────────────────────────────────────────
    const slotGroups: SlotGroup[] = useMemo(() => {
        const map = new Map<string, SlotGroup>()

        for (const item of items) {
            const slot = item.start_timestamp ? slotFromTimestamp(item.start_timestamp) : "??"
            const queueName = item.callback_queue_name ?? ""
            const key = `${queueName}||${slot}`

            if (!map.has(key)) {
                map.set(key, {
                    queue_name: queueName,
                    time_slot: slot,
                    total: 0,
                    enqueued: 0,
                    cust_ended: 0,
                    ewt_avg: null,
                    items: [],
                })
            }

            const group = map.get(key)!
            group.total++
            if (item.outcome === "enqueued") {
                group.enqueued++
            } else {
                group.cust_ended++
            }
            group.items.push(item)
        }

        // calcular ewt promedio por grupo
        for (const group of map.values()) {
            const ewts = group.items
                .map((i) => i.ewt_given_minutes)
                .filter((v): v is number => v != null)
            if (ewts.length > 0) {
                group.ewt_avg = Math.round(ewts.reduce((a, b) => a + b, 0) / ewts.length)
            }
        }

        return Array.from(map.values()).sort((a, b) => {
            const qCmp = a.queue_name.localeCompare(b.queue_name)
            if (qCmp !== 0) return qCmp
            return a.time_slot.localeCompare(b.time_slot)
        })
    }, [items])

    // ─── sort de la tabla de slots ────────────────────────────────────────────
    function handleSort(col: string) {
        setSortState((prev) => {
            if (prev.column !== col) return { column: col, direction: "asc" }
            if (prev.direction === "asc") return { column: col, direction: "desc" }
            return { column: null, direction: null }
        })
    }

    function getValue(g: SlotGroup, col: string): unknown {
        switch (col) {
            case "queue_name": return g.queue_name
            case "time_slot": return g.time_slot
            case "total": return g.total
            case "enqueued": return g.enqueued
            case "cust_ended": return g.cust_ended
            case "ewt_avg": return g.ewt_avg
            default: return null
        }
    }

    const sortedGroups = useMemo(() => {
        if (!sortState.column) return slotGroups
        return [...slotGroups].sort((a, b) => {
            const va = getValue(a, sortState.column!)
            const vb = getValue(b, sortState.column!)
            if (va == null && vb == null) return 0
            if (va == null) return 1
            if (vb == null) return -1
            const na = Number(va); const nb = Number(vb)
            const cmp = !isNaN(na) && !isNaN(nb)
                ? na - nb
                : String(va).localeCompare(String(vb), undefined, { sensitivity: "base" })
            return sortState.direction === "asc" ? cmp : -cmp
        })
    }, [slotGroups, sortState])

    // ─── expand/collapse ──────────────────────────────────────────────────────
    function toggleRow(key: string) {
        setExpandedRows((prev) => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })
    }

    // ─── CSV export ───────────────────────────────────────────────────────────
    function exportToCSV() {
        if (!items.length) return
        const headers = ["Contact ID", "Start Timestamp", "Callback Queue", "Origin Queue", "Type", "Outcome", "EWT (min)"]
        const rows = items.map((i) => [
            i.contact_id ?? "",
            i.start_timestamp ?? "",
            i.callback_queue_name ?? "",
            i.origin_queue_name ?? "",
            i.selected_callback_type ?? "",
            i.outcome ?? "",
            i.ewt_given_minutes != null ? String(i.ewt_given_minutes) : "",
        ])
        const csv = [headers, ...rows]
            .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
            .join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `not-accepted-${selectedDate}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    // ─── sort icon ────────────────────────────────────────────────────────────
    const SortIcon = ({ col }: { col: string }) => {
        if (sortState.column !== col) return null
        return sortState.direction === "asc"
            ? <ChevronUp className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />
    }

    // ─── render ───────────────────────────────────────────────────────────────
    return (
        <PageLayout title={t({ id: "notAccepted.title" })} description={t({ id: "notAccepted.description" })}>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{t({ id: "notAccepted.title" })}</CardTitle>
                            <CardDescription>{t({ id: "notAccepted.description" })}</CardDescription>
                        </div>
                        {items.length > 0 && (
                            <Button variant="outline" size="sm" onClick={exportToCSV} className="flex items-center gap-2">
                                <Download className="h-4 w-4" />
                                {t({ id: "notAccepted.downloadCSV" })}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {/* filtros */}
                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label>{t({ id: "notAccepted.filterByQueue" })}</Label>
                            <Select
                                value={selectedQueue || "all"}
                                onValueChange={(v) => setSelectedQueue(v === "all" ? undefined : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t({ id: "notAccepted.allQueues" })} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t({ id: "notAccepted.allQueues" })}</SelectItem>
                                    {queues.map((q) => (
                                        <SelectItem key={q.id} value={q.name}>{q.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t({ id: "notAccepted.filterByDate" })}</Label>
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button variant="default" onClick={() => {
                                setSelectedQueue(undefined)
                                setSelectedDate(new Date().toISOString().split("T")[0])
                                setSortState({ column: null, direction: null })
                                setExpandedRows(new Set())
                            }} className="w-full">
                                {t({ id: "common.clear" })}
                            </Button>
                        </div>
                    </div>

                    {/* contenido */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2">{t({ id: "common.loading" })}</span>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center text-destructive flex items-center justify-center gap-2">
                            <XCircle className="h-4 w-4" />
                            {t({ id: "notAccepted.error.loading" })}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="rounded-lg border p-4 text-center text-muted-foreground">
                            {t({ id: "notAccepted.noData" })}
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 text-sm text-muted-foreground">
                                {t({ id: "notAccepted.showingResults" }, { count: items.length })}
                            </div>
                            <div className="rounded-md border">
                                <Table containerClassName="max-h-[1024px] overflow-y-auto">
                                    <TableHeader className="sticky top-0 z-10 bg-background [&_th]:bg-background">
                                        <TableRow>
                                            {/* expand toggle placeholder */}
                                            <TableHead className="w-8" />
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort("queue_name")}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: "notAccepted.callbackQueue" })}
                                                    <SortIcon col="queue_name" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort("time_slot")}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: "notAccepted.timeSlot" })}
                                                    <SortIcon col="time_slot" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort("total")}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: "notAccepted.total" })}
                                                    <SortIcon col="total" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort("enqueued")}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: "notAccepted.enqueued" })}
                                                    <SortIcon col="enqueued" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort("cust_ended")}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: "notAccepted.custEnded" })}
                                                    <SortIcon col="cust_ended" />
                                                </div>
                                            </TableHead>
                                            <TableHead className="cursor-pointer select-none" onClick={() => handleSort("ewt_avg")}>
                                                <div className="flex items-center gap-1">
                                                    {t({ id: "notAccepted.ewtAvg" })}
                                                    <SortIcon col="ewt_avg" />
                                                </div>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedGroups.map((group) => {
                                            const key = `${group.queue_name}||${group.time_slot}`
                                            const isExpanded = expandedRows.has(key)
                                            return (
                                                <>
                                                    {/* fila de slot */}
                                                    <TableRow
                                                        key={key}
                                                        className="cursor-pointer hover:bg-muted/50"
                                                        onClick={() => toggleRow(key)}
                                                    >
                                                        <TableCell className="text-center">
                                                            {isExpanded
                                                                ? <ChevronUp className="h-4 w-4 inline" />
                                                                : <ChevronDown className="h-4 w-4 inline" />}
                                                        </TableCell>
                                                        <TableCell>{group.queue_name || "-"}</TableCell>
                                                        <TableCell className="font-mono">{group.time_slot}</TableCell>
                                                        <TableCell className="font-semibold">{group.total}</TableCell>
                                                        <TableCell>{group.enqueued}</TableCell>
                                                        <TableCell>{group.cust_ended}</TableCell>
                                                        <TableCell>
                                                            {group.ewt_avg != null ? `${group.ewt_avg} min` : "-"}
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* detalle expandible */}
                                                    {isExpanded && (
                                                        <TableRow key={`${key}-detail`}>
                                                            <TableCell colSpan={7} className="p-0 bg-muted/20">
                                                                <div className="p-3">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead className="text-xs">{t({ id: "notAccepted.contactId" })}</TableHead>
                                                                                <TableHead className="text-xs">{t({ id: "notAccepted.startTimestamp" })}</TableHead>
                                                                                <TableHead className="text-xs">{t({ id: "notAccepted.originQueue" })}</TableHead>
                                                                                <TableHead className="text-xs">{t({ id: "notAccepted.callbackType" })}</TableHead>
                                                                                <TableHead className="text-xs">{t({ id: "notAccepted.outcome" })}</TableHead>
                                                                                <TableHead className="text-xs">{t({ id: "notAccepted.ewtMinutes" })}</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {group.items.map((item) => (
                                                                                <TableRow key={item.contact_id}>
                                                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                                                        {item.contact_id}
                                                                                    </TableCell>
                                                                                    <TableCell className="font-mono text-xs">
                                                                                        {item.start_timestamp ? formatPrTime(item.start_timestamp) : "-"}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-xs">
                                                                                        {item.origin_queue_name ?? "-"}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-xs">
                                                                                        {item.selected_callback_type ?? "-"}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-xs">
                                                                                        {item.outcome
                                                                                            ? item.outcome
                                                                                            : <span className="text-muted-foreground italic">cust ended</span>}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-xs">
                                                                                        {item.ewt_given_minutes != null
                                                                                            ? `${item.ewt_given_minutes} min`
                                                                                            : "-"}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </>
                                            )
                                        })}
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
