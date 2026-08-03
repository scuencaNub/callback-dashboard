import { AlertCircle, Check, Pencil, PencilOff, Search, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"
import { useIntl } from "react-intl"
import { useAuth } from "../components/auth/AuthProvider"
import { PageLayout } from "../components/pageLayout"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Checkbox } from "../components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { useBulkUpdateCallInSystemByKeys } from "../hooks/queries/useBulkUpdateCallInSystemByKeys"
import { useQueues } from "../hooks/queries/useQueues"
import { useUpdateCallInSystem } from "../hooks/queries/useUpdateCallInSystem"
import { formatDateTime } from "../lib/formatDateTime"
import { getStatusColor } from "../lib/getStatusColor"
import { convertLocalDateTimeToUtcTimestamp, convertUtcTimestampToLocalDateTime } from "../lib/timeConversion"
import { useDataStore } from "../stores/useDataStore"

type CallsInSystem = {
    contact_id_inbound: string
    customer_phone_number: string
    queue_name: string
    call_at: string
    status: string
}

const STATUS_OPTIONS = ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED", "RESCHEDULED"] as const

// Debounce util in-page to avoid adding new files now
function useDebouncedSearch(setter: (value: string) => void, delay: number = 300) {
    const [timer, setTimer] = useState<number | null>(null)
    return (value: string) => {
        if (timer) window.clearTimeout(timer)
        const t = window.setTimeout(() => setter(value), delay)
        setTimer(t)
    }
}

// NOTE: call_at is a full timestamp; we reuse shared UTC<->UTC-4 conversion helpers from lib/timeConversion.ts

const MAX_SELECTION = 500

export default function QueueSchedules() {
    const intl = useIntl()
    const { canEdit } = useAuth()
    const editDisabled = !canEdit

    const [searchCallQuery, setSearchCallQuery] = useState("")
    const [editingCall, setEditingCall] = useState<string | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)
    const [showError, setShowError] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [selectedQueue, setSelectedQueue] = useState<string>("")
    const [selectedQueueFilter, setSelectedQueueFilter] = useState<string>("todas")
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("todos")
    const [selectedTimestamp, setSelectedTimestamp] = useState<string>("")
    const [selectedStatus, setSelectedStatus] = useState<string>("")
    const [inputCallQueryValue, setInputCallQueryValue] = useState("")

    // Batch update state
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    const [showBatchDialog, setShowBatchDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [batchQueue, setBatchQueue] = useState<string>("")
    const [batchTimestamp, setBatchTimestamp] = useState<string>("")
    const [batchStatus, setBatchStatus] = useState<string>("")
    const [isBatchUpdating, setIsBatchUpdating] = useState(false)
    const [batchResults, setBatchResults] = useState<{ success: number; failed: number } | null>(null)
    const [isDeletingSelected, setIsDeletingSelected] = useState(false)
    const [deleteResults, setDeleteResults] = useState<{ success: number; failed: number } | null>(null)

    const debouncedCallSearch = useDebouncedSearch(setSearchCallQuery)
    const { data: queues = [] } = useQueues()

    const { callbacks } = useDataStore()
    const isLoadingCallbacks = false
    const updateCallMutation = useUpdateCallInSystem()
    const bulkUpdateByKeysMutation = useBulkUpdateCallInSystemByKeys()

    const resetFilters = () => {
        setSearchCallQuery("")
        setInputCallQueryValue("")
        setSelectedQueueFilter("todas")
        setSelectedStatusFilter("todos")
    }

    // Filter calls first
    const filteredCalls = useMemo(() => {
        return callbacks.filter(
            (callback: CallsInSystem) => {
                const matchesSearch =
                    callback.customer_phone_number.includes(searchCallQuery) ||
                    callback.contact_id_inbound.includes(searchCallQuery) ||
                    callback.queue_name.toLowerCase().includes(searchCallQuery.toLowerCase())

                const matchesQueue = selectedQueueFilter === "todas" || callback.queue_name === selectedQueueFilter
                const matchesStatus = selectedStatusFilter === "todos" || callback.status === selectedStatusFilter

                return matchesSearch && matchesQueue && matchesStatus
            }
        )
    }, [callbacks, searchCallQuery, selectedQueueFilter, selectedStatusFilter])

    // Get selected callbacks
    const selectedCallbacks = useMemo(() => {
        return callbacks.filter((callback: CallsInSystem) =>
            selectedItems.has(callback.contact_id_inbound)
        )
    }, [callbacks, selectedItems])

    // Toggle item selection
    const toggleItemSelection = (contactId: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev)
            if (newSet.has(contactId)) {
                newSet.delete(contactId)
            } else {
                if (newSet.size < MAX_SELECTION) {
                    newSet.add(contactId)
                }
            }
            return newSet
        })
    }

    // Toggle select all (limited to MAX_SELECTION)
    const toggleSelectAll = () => {
        if (selectedItems.size === filteredCalls.length && filteredCalls.length <= MAX_SELECTION) {
            setSelectedItems(new Set())
        } else {
            const itemsToSelect = filteredCalls.slice(0, MAX_SELECTION)
            setSelectedItems(new Set(itemsToSelect.map((c: CallsInSystem) => c.contact_id_inbound)))
        }
    }

    // Check if all visible items are selected (up to MAX_SELECTION)
    const isAllSelected = useMemo(() => {
        const visibleItems = filteredCalls.slice(0, MAX_SELECTION)
        return visibleItems.length > 0 &&
            visibleItems.every((c: CallsInSystem) => selectedItems.has(c.contact_id_inbound))
    }, [filteredCalls, selectedItems])

    const handleQueueChange = async (callback: CallsInSystem, newQueue: string, newTimestamp: string) => {
        const selectedQueueObj = queues.find((q: any) => q.name === newQueue)

        if (!selectedQueueObj) {
            setErrorMessage("Selected queue not found")
            setShowError(true)
            return
        }

        const queueIsActive = selectedQueueObj.active ?? true

        if (!queueIsActive) {
            setErrorMessage("Cannot assign a call to an inactive queue")
            setShowError(true)
            return
        }

        try {
            // User edits in UTC-4; backend expects UTC
            const formattedTimestamp = convertLocalDateTimeToUtcTimestamp(newTimestamp)
            const isCallAtChanging = formattedTimestamp !== callback.call_at

            // Build update payload
            const updatePayload: any = {
                contact_id_inbound: callback.contact_id_inbound,
                current_call_at: callback.call_at, // Use current call_at for identification (sort key)
                queue_name: newQueue,
                queue_id: selectedQueueObj.id, // Use queue id from the selected queue
            }

            // Only include call_at if it changed (NOTE: call_at is part of the PK in DynamoDB, so the single-item
            // endpoint cannot update it via UpdateItem. For call_at changes, we must use bulk-update-by-keys even for 1 item.)
            if (isCallAtChanging) updatePayload.call_at = formattedTimestamp

            // Only include status if it changed
            if (selectedStatus && selectedStatus !== callback.status) {
                updatePayload.status = selectedStatus
            }

            console.log(`Updating call ${callback.contact_id_inbound} with:`, updatePayload)

            if (isCallAtChanging) {
                await bulkUpdateByKeysMutation.mutateAsync({
                    items: [{ contact_id_inbound: callback.contact_id_inbound, call_at: callback.call_at }],
                    update_fields: {
                        queue_name: newQueue,
                        queue_id: selectedQueueObj.id,
                        ...(selectedStatus && selectedStatus !== callback.status ? { status: selectedStatus } : {}),
                        call_at: formattedTimestamp,
                    },
                    max_concurrency: 20,
                })
            } else {
                await updateCallMutation.mutateAsync(updatePayload)
            }

            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 3000)

            setEditingCall(null)
            setSelectedQueue("")
            setSelectedTimestamp("")
            setSelectedStatus("")
        } catch (error: any) {
            console.error("Error while saving:", error)
            setErrorMessage(error?.message || "We've a problem, try again")
            setShowError(true)
        }
    }

    const handleDeleteSelected = async () => {
        if (selectedCallbacks.length === 0) return

        setIsDeletingSelected(true)
        setDeleteResults(null)

        try {
            let successCount = 0
            let failedCount = 0

            if (selectedCallbacks.length === 1) {
                const callback = selectedCallbacks[0]
                const updatePayload: any = {
                    contact_id_inbound: callback.contact_id_inbound,
                    current_call_at: callback.call_at,
                    status: "DELETED",
                }

                await updateCallMutation.mutateAsync(updatePayload)
                successCount = 1
                failedCount = 0
            } else {
                const items = selectedCallbacks.map((c: CallsInSystem) => ({
                    contact_id_inbound: c.contact_id_inbound,
                    call_at: c.call_at,
                }))

                const resp = await bulkUpdateByKeysMutation.mutateAsync({
                    items,
                    update_fields: { status: "DELETED" },
                    max_concurrency: 20,
                })

                successCount = resp.summary.processed
                failedCount = resp.summary.failed
            }

            setDeleteResults({ success: successCount, failed: failedCount })

            if (failedCount === 0) {
                setShowSuccess(true)
                setTimeout(() => setShowSuccess(false), 3000)
            } else {
                setErrorMessage(`${successCount} items deleted successfully, ${failedCount} failed`)
                setShowError(true)
            }

            // Close dialog and clear selection
            setShowDeleteDialog(false)
            setSelectedItems(new Set())
            resetFilters()
        } catch (error: any) {
            console.error("Error deleting selected:", error)
            setErrorMessage(error?.message || "Delete selected failed")
            setShowError(true)
        } finally {
            setIsDeletingSelected(false)
        }
    }

    // Batch update handler
    const handleBatchUpdate = async () => {
        if (selectedCallbacks.length === 0) return

        const selectedQueueObj = batchQueue ? queues.find((q: any) => q.name === batchQueue) : null

        if (batchQueue && !selectedQueueObj) {
            setErrorMessage("Selected queue not found")
            setShowError(true)
            return
        }

        if (batchQueue && selectedQueueObj && !selectedQueueObj.active) {
            setErrorMessage("Cannot assign calls to an inactive queue")
            setShowError(true)
            return
        }

        setIsBatchUpdating(true)
        setBatchResults(null)

        try {
            let successCount = 0
            let failedCount = 0

            // If only one item, keep using the existing single-item endpoint
            if (selectedCallbacks.length === 1) {
                const callback = selectedCallbacks[0]
                const updatePayload: any = {
                    contact_id_inbound: callback.contact_id_inbound,
                    current_call_at: callback.call_at,
                }

                if (batchQueue && selectedQueueObj) {
                    updatePayload.queue_name = batchQueue
                    updatePayload.queue_id = selectedQueueObj.id
                }

                const wantsCallAtChange = Boolean(batchTimestamp && convertLocalDateTimeToUtcTimestamp(batchTimestamp) !== callback.call_at)
                if (batchTimestamp) {
                    const formattedTimestamp = convertLocalDateTimeToUtcTimestamp(batchTimestamp)
                    if (formattedTimestamp !== callback.call_at) {
                        updatePayload.call_at = formattedTimestamp
                    }
                }

                if (batchStatus) {
                    updatePayload.status = batchStatus
                }

                if (wantsCallAtChange) {
                    await bulkUpdateByKeysMutation.mutateAsync({
                        items: [{ contact_id_inbound: callback.contact_id_inbound, call_at: callback.call_at }],
                        update_fields: {
                            ...(batchQueue && selectedQueueObj ? { queue_name: batchQueue, queue_id: selectedQueueObj.id } : {}),
                            ...(batchStatus ? { status: batchStatus } : {}),
                            ...(batchTimestamp ? { call_at: convertLocalDateTimeToUtcTimestamp(batchTimestamp) } : {}),
                        },
                        max_concurrency: 20,
                    })
                } else {
                    await updateCallMutation.mutateAsync(updatePayload)
                }
                successCount = 1
                failedCount = 0
                setBatchResults({ success: successCount, failed: failedCount })
            } else {
                // Bulk-by-keys endpoint (best UX for large batches)
                const items = selectedCallbacks.map((c: CallsInSystem) => ({
                    contact_id_inbound: c.contact_id_inbound,
                    call_at: c.call_at,
                }))

                const update_fields: any = {}
                if (batchQueue && selectedQueueObj) {
                    update_fields.queue_name = batchQueue
                    update_fields.queue_id = selectedQueueObj.id
                }
                if (batchTimestamp) {
                    update_fields.call_at = convertLocalDateTimeToUtcTimestamp(batchTimestamp)
                }
                if (batchStatus) {
                    update_fields.status = batchStatus
                }

                const resp = await bulkUpdateByKeysMutation.mutateAsync({
                    items,
                    update_fields,
                    max_concurrency: 20,
                })

                successCount = resp.summary.processed
                failedCount = resp.summary.failed
                setBatchResults({ success: successCount, failed: failedCount })
            }

            if (failedCount === 0) {
                setShowSuccess(true)
                setTimeout(() => setShowSuccess(false), 3000)
            } else {
                setErrorMessage(`${successCount} items updated successfully, ${failedCount} failed`)
                setShowError(true)
            }

            // Close dialog and clear selection
            setShowBatchDialog(false)
            setSelectedItems(new Set())
            setBatchQueue("")
            setBatchTimestamp("")
            setBatchStatus("")
            resetFilters()
        } catch (error: any) {
            console.error("Error in batch update:", error)
            setErrorMessage(error?.message || "Batch update failed")
            setShowError(true)
        } finally {
            setIsBatchUpdating(false)
        }
    }

    return (
        <PageLayout
            title={intl.formatMessage({ id: 'sidebar.queueSchedules' })}
        >
            <Card>
                <CardHeader>
                    <CardTitle>{"Calls in System"}</CardTitle>
                    <CardDescription>{"Management and reassignment of calls between queues"}</CardDescription>
                    {!editDisabled && selectedItems.size > 0 && (
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected (max {MAX_SELECTION})
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => setShowBatchDialog(true)}
                                    variant="default"
                                    size="sm"
                                >
                                    Edit Selected ({selectedItems.size})
                                </Button>
                                <Button
                                    onClick={() => setShowDeleteDialog(true)}
                                    variant="destructive"
                                    size="sm"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Selected ({selectedItems.size})
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={"Search by phone or queue..."}
                                className="pl-8"
                                value={inputCallQueryValue}
                                onChange={(e) => {
                                    setInputCallQueryValue(e.target.value)
                                    debouncedCallSearch(e.target.value)
                                }}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Select value={selectedQueueFilter} onValueChange={setSelectedQueueFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by queue" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todas">All queues</SelectItem>
                                        {queues.map((queue: any) => (
                                            <SelectItem key={queue.name} value={queue.name}>
                                                {queue.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">All statuses</SelectItem>
                                        {STATUS_OPTIONS.map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="overflow-y-auto overflow-x-hidden h-[550px]">
                    {isLoadingCallbacks ? (
                        <div className="flex justify-center items-center py-8 overflow-x-hidden">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <Table className="w-full overflow-x-hidden">
                            <TableHeader>
                                <TableRow>
                                    {!editDisabled && (
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={isAllSelected}
                                                onCheckedChange={toggleSelectAll}
                                                disabled={filteredCalls.length === 0 || filteredCalls.length > MAX_SELECTION}
                                            />
                                        </TableHead>
                                    )}
                                    <TableHead className="w-[120px]">ID</TableHead>
                                    <TableHead className="w-[140px]">Phone</TableHead>
                                    <TableHead className="w-[180px]">Current Queue</TableHead>
                                    <TableHead className="w-[180px]">Date and Time</TableHead>
                                    <TableHead className="w-[120px]">Status</TableHead>
                                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCalls.map((callback: CallsInSystem) => (
                                    <TableRow key={callback.contact_id_inbound} className="p-2">
                                        {!editDisabled && (
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedItems.has(callback.contact_id_inbound)}
                                                    onCheckedChange={() => toggleItemSelection(callback.contact_id_inbound)}
                                                    disabled={!selectedItems.has(callback.contact_id_inbound) && selectedItems.size >= MAX_SELECTION}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell className="font-medium truncate">{callback.contact_id_inbound}</TableCell>
                                        <TableCell className="truncate">{callback.customer_phone_number}</TableCell>
                                        <TableCell className="min-w-0">
                                            {editingCall === callback.contact_id_inbound ? (
                                                <Select value={selectedQueue} onValueChange={(value) => setSelectedQueue(value)} >
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="Select queue" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {queues.map((queue: any) => (
                                                            <SelectItem key={queue.name} value={queue.name} disabled={queue.active === false}>
                                                                {queue.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="font-medium">{callback.queue_name}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="truncate p-2">
                                            {editingCall === callback.contact_id_inbound ? (
                                                <Input
                                                    type="datetime-local"
                                                    value={selectedTimestamp || convertUtcTimestampToLocalDateTime(callback.call_at)}
                                                    onChange={(e) => setSelectedTimestamp(e.target.value)}
                                                    className="w-full"
                                                />
                                            ) : (
                                                formatDateTime(callback.call_at)
                                            )}
                                        </TableCell>
                                        <TableCell className="min-w-0">
                                            {editingCall === callback.contact_id_inbound ? (
                                                <Select
                                                    value={selectedStatus || callback.status}
                                                    onValueChange={(value) => setSelectedStatus(value)}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {STATUS_OPTIONS.map((s) => (
                                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Badge variant="outline" className={`capitalize whitespace-nowrap ${getStatusColor(callback.status)}`}>
                                                    {callback.status.toLowerCase().replace("_", " ")}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {editingCall === callback.contact_id_inbound ? (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => {
                                                            const newQueue = selectedQueue || callback.queue_name
                                                            const newTimestamp = selectedTimestamp || convertUtcTimestampToLocalDateTime(callback.call_at)

                                                            handleQueueChange(callback, newQueue, newTimestamp)
                                                        }}
                                                        disabled={updateCallMutation.isPending}
                                                    >
                                                        {updateCallMutation.isPending ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                        ) : (
                                                            <Check className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingCall(null)
                                                            setSelectedQueue("")
                                                            setSelectedTimestamp("")
                                                        }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="relative inline-block group"
                                                    title={editDisabled ? "Editing is disabled" : undefined}
                                                >
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingCall(callback.contact_id_inbound)
                                                            setSelectedQueue(callback.queue_name)
                                                            setSelectedTimestamp(convertUtcTimestampToLocalDateTime(callback.call_at))
                                                            setSelectedStatus(callback.status)
                                                        }}
                                                        disabled={editDisabled}
                                                    >
                                                        {editDisabled ? <PencilOff className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                                                    </Button>
                                                    {editDisabled && (
                                                        <span className="absolute left-0 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap px-2 py-1 text-xs rounded bg-gray-800 text-white opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                                                            Editing is disabled
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {showSuccess && (
                <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center shadow-lg">
                    <Check className="h-5 w-5 mr-2" />
                    <span>Changes saved successfully</span>
                </div>
            )}

            {showError && (
                <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center shadow-lg">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{errorMessage}</span>
                    <Button variant="ghost" size="icon" className="ml-2" onClick={() => setShowError(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Batch Update Dialog */}
            <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Selected Items ({selectedItems.size})</DialogTitle>
                        <DialogDescription>
                            Update queue and/or timestamp for all selected items. Leave fields empty to keep current values.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="batch-queue">Queue</Label>
                            <Select value={batchQueue || "__none__"} onValueChange={(value) => setBatchQueue(value === "__none__" ? "" : value)}>
                                <SelectTrigger id="batch-queue">
                                    <SelectValue placeholder="Select queue" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Keep current queue</SelectItem>
                                    {queues.map((queue: any) => (
                                        <SelectItem key={queue.name} value={queue.name} disabled={queue.active === false}>
                                            {queue.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="batch-timestamp">New Date and Time</Label>
                            <Input
                                id="batch-timestamp"
                                type="datetime-local"
                                value={batchTimestamp}
                                onChange={(e) => setBatchTimestamp(e.target.value)}
                                placeholder="Keep current timestamp"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="batch-status">Status</Label>
                            <Select value={batchStatus || "__none__"} onValueChange={(value) => setBatchStatus(value === "__none__" ? "" : value)}>
                                <SelectTrigger id="batch-status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Keep current status</SelectItem>
                                    {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {batchResults && (
                            <div className={`p-3 rounded-md ${batchResults.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                                <p className="text-sm">
                                    {batchResults.success} item{batchResults.success !== 1 ? 's' : ''} updated successfully
                                    {batchResults.failed > 0 && `, ${batchResults.failed} failed`}
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowBatchDialog(false)
                                setBatchQueue("")
                                setBatchTimestamp("")
                                setBatchStatus("")
                                setBatchResults(null)
                            }}
                            disabled={isBatchUpdating}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBatchUpdate}
                            disabled={isBatchUpdating || (!batchQueue && !batchTimestamp && !batchStatus)}
                        >
                            {isBatchUpdating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Updating...
                                </>
                            ) : (
                                "Apply Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Selected Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Delete Selected Items ({selectedItems.size})</DialogTitle>
                        <DialogDescription>
                            This will set the status of all selected items to <strong>DELETED</strong>. This action is not reversible from the UI.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 py-4">
                        {deleteResults && (
                            <div className={`p-3 rounded-md ${deleteResults.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                                <p className="text-sm">
                                    {deleteResults.success} item{deleteResults.success !== 1 ? 's' : ''} deleted successfully
                                    {deleteResults.failed > 0 && `, ${deleteResults.failed} failed`}
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteDialog(false)
                                setDeleteResults(null)
                            }}
                            disabled={isDeletingSelected}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteSelected}
                            disabled={isDeletingSelected || selectedItems.size === 0}
                        >
                            {isDeletingSelected ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageLayout>
    )
}
