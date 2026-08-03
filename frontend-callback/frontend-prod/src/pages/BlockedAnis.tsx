import { Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useIntl } from "react-intl"
import { PageLayout } from "../components/pageLayout"
import { Button } from "../components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table"
import { Badge } from "../components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../components/ui/alert-dialog"
import {
    type BlockedAniItem,
    useBlockedAnisView,
    useCreateBlockedAni,
    useUpdateBlockedAni,
    useDeleteBlockedAni,
} from "../hooks/queries/useBlockedAnisInfo"

function getBlockedStatus(blockedUntil: string): "active" | "expired" {
    const now = new Date()
    const until = new Date(blockedUntil)
    return until > now ? "active" : "expired"
}

function formatDateTime(isoString: string): string {
    if (!isoString) return "-"
    const parsed = new Date(isoString)
    if (Number.isNaN(parsed.getTime())) return isoString
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(parsed)
}

function normalizePhoneNumber(phone: string): string {
    const trimmed = phone.trim()
    if (!trimmed) return trimmed
    return trimmed.startsWith("+") ? trimmed : `+${trimmed}`
}

/**
 * Validates phone number format: +1 followed by 10 digits (US/Puerto Rico).
 * Accepts with or without the leading +, normalization happens separately.
 */
function isValidPhoneNumber(phone: string): boolean {
    const normalized = normalizePhoneNumber(phone)
    return /^\+1\d{10}$/.test(normalized)
}

function toDateInputValue(isoString: string): string {
    if (!isoString) return ""
    const parsed = new Date(isoString)
    if (Number.isNaN(parsed.getTime())) return ""
    return parsed.toISOString().split("T")[0]
}

export default function BlockedAnis() {
    const { formatMessage: t } = useIntl()
    const [searchQuery, setSearchQuery] = useState<string>("")
    const { data, isLoading, isError, error, refetch, isFetching } = useBlockedAnisView()

    // Mutations
    const createMutation = useCreateBlockedAni()
    const updateMutation = useUpdateBlockedAni()
    const deleteMutation = useDeleteBlockedAni()

    // Dialog states
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    // Form states
    const [addPhone, setAddPhone] = useState("")
    const [addBlockedUntil, setAddBlockedUntil] = useState("")
    const [editPhone, setEditPhone] = useState("")
    const [editBlockedUntil, setEditBlockedUntil] = useState("")
    const [editOriginalPhone, setEditOriginalPhone] = useState("")
    const [deleteTarget, setDeleteTarget] = useState<BlockedAniItem | null>(null)
    const [addPhoneError, setAddPhoneError] = useState("")
    const [editPhoneError, setEditPhoneError] = useState("")
    const [addDateError, setAddDateError] = useState("")
    const [editDateError, setEditDateError] = useState("")

    // Alert state
    const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)

    const showAlert = (type: "success" | "error", message: string) => {
        setAlert({ type, message })
        setTimeout(() => setAlert(null), 5000)
    }

    const items = data?.items ?? []

    const filteredAnis = useMemo(() => {
        if (!searchQuery.trim()) return items
        const query = searchQuery.trim().toLowerCase()
        return items.filter((item) =>
            item.phone_number.includes(query)
        )
    }, [searchQuery, items])

    const handleSearch = () => {
        // Filtering is reactive via useMemo
    }

    // --- Add ---
    const handleOpenAdd = () => {
        setAddPhone("")
        setAddBlockedUntil("")
        setAddPhoneError("")
        setAddDateError("")
        setAddDialogOpen(true)
    }

    const handleConfirmAdd = () => {
        if (!addPhone.trim() || !addBlockedUntil) return
        if (!isValidPhoneNumber(addPhone)) {
            setAddPhoneError("Invalid format. Expected: +1 followed by 10 digits (US/PR)")
            return
        }
        const selectedDate = new Date(`${addBlockedUntil}T23:59:59`)
        if (selectedDate <= new Date()) {
            setAddDateError("Date must be in the future")
            return
        }
        setAddPhoneError("")
        setAddDateError("")
        createMutation.mutate(
            { phone_number: normalizePhoneNumber(addPhone), blocked_until: `${addBlockedUntil}T00:00:00Z` },
            {
                onSuccess: () => {
                    setAddDialogOpen(false)
                    showAlert("success", "ANI blocked successfully")
                },
                onError: (err) => {
                    showAlert("error", err.message || "Failed to create blocked ANI")
                },
            }
        )
    }

    // --- Edit ---
    const handleOpenEdit = (item: BlockedAniItem) => {
        setEditOriginalPhone(item.phone_number)
        setEditPhone(item.phone_number)
        setEditBlockedUntil(toDateInputValue(item.blocked_until))
        setEditPhoneError("")
        setEditDateError("")
        setEditDialogOpen(true)
    }

    const handleConfirmEdit = () => {
        if (!editPhone.trim() || !editBlockedUntil) return
        if (!isValidPhoneNumber(editPhone)) {
            setEditPhoneError("Invalid format. Expected: +1 followed by 10 digits (US/PR)")
            return
        }
        const selectedDate = new Date(`${editBlockedUntil}T23:59:59`)
        if (selectedDate <= new Date()) {
            setEditDateError("Date must be in the future")
            return
        }
        setEditPhoneError("")
        setEditDateError("")
        updateMutation.mutate(
            {
                originalPhoneNumber: editOriginalPhone,
                payload: { phone_number: normalizePhoneNumber(editPhone), blocked_until: `${editBlockedUntil}T00:00:00Z` },
            },
            {
                onSuccess: () => {
                    setEditDialogOpen(false)
                    showAlert("success", "ANI updated successfully")
                },
                onError: (err) => {
                    showAlert("error", err.message || "Failed to update blocked ANI")
                },
            }
        )
    }

    // --- Delete ---
    const handleOpenDelete = (item: BlockedAniItem) => {
        setDeleteTarget(item)
        setDeleteDialogOpen(true)
    }

    const handleConfirmDelete = () => {
        if (!deleteTarget) return
        deleteMutation.mutate(deleteTarget.phone_number, {
            onSuccess: () => {
                setDeleteDialogOpen(false)
                setDeleteTarget(null)
                showAlert("success", "ANI unblocked successfully")
            },
            onError: (err) => {
                showAlert("error", err.message || "Failed to delete blocked ANI")
            },
        })
    }

    return (
        <PageLayout title={t({ id: 'sidebar.blockedAnis' })}>
            <div className="space-y-6">
                {/* Alert */}
                {alert && (
                    <div
                        className={`rounded-md border px-4 py-3 text-sm ${
                            alert.type === "success"
                                ? "border-green-200 bg-green-50 text-green-800"
                                : "border-red-200 bg-red-50 text-red-800"
                        }`}
                    >
                        {alert.message}
                    </div>
                )}
                {/* Search Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t({ id: 'blockedAnis.search' })}</CardTitle>
                        <CardDescription>
                            {t({ id: 'blockedAnis.description' })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="search-phone">{t({ id: 'blockedAnis.inputLabel' })}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="search-phone"
                                    placeholder="e.g. 17877659800"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSearch()
                                    }}
                                />
                                <Button onClick={handleSearch} className="shrink-0">
                                    <Search className="mr-2 h-4 w-4" />
                                    {t({ id: 'connectContacts.search' })}
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t({ id: 'blockedAnis.helperText' })}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{t({ id: 'blockedAnis.list' })}</CardTitle>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => refetch()}
                                    disabled={isFetching}
                                >
                                    <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                                    Refresh
                                </Button>
                                <Button onClick={handleOpenAdd} size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">Loading blocked numbers...</span>
                            </div>
                        ) : isError ? (
                            <div className="text-sm text-destructive py-4 text-center">
                                Error loading data: {error?.message ?? "Unknown error"}
                            </div>
                        ) : filteredAnis.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-4 text-center">
                                No blocked phone numbers match your search.
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Phone Number</TableHead>
                                            <TableHead>Blocked Until</TableHead>
                                            <TableHead>Created At</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAnis.map((item) => {
                                            const status = getBlockedStatus(item.blocked_until)
                                            return (
                                                <TableRow key={item.phone_number}>
                                                    <TableCell className="font-mono">
                                                        {item.phone_number}
                                                    </TableCell>
                                                    <TableCell>{formatDateTime(item.blocked_until)}</TableCell>
                                                    <TableCell>{formatDateTime(item.created_at)}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={status === "active" ? "destructive" : "secondary"}
                                                        >
                                                            {status === "active" ? "Blocked" : "Block Expired"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => handleOpenEdit(item)}
                                                                title="Edit"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => handleOpenDelete(item)}
                                                                title="Delete"
                                                                className="text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Blocked ANI</DialogTitle>
                        <DialogDescription>
                            Enter the phone number and the date until which it should be blocked.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="add-phone">Phone Number</Label>
                            <Input
                                id="add-phone"
                                placeholder="+17871234567"
                                value={addPhone}
                                maxLength={12}
                                onChange={(e) => { setAddPhone(e.target.value); setAddPhoneError("") }}
                            />
                            {addPhoneError && (
                                <p className="text-sm text-destructive">{addPhoneError}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="add-blocked-until">Blocked Until</Label>
                            <Input
                                id="add-blocked-until"
                                type="date"
                                value={addBlockedUntil}
                                onChange={(e) => { setAddBlockedUntil(e.target.value); setAddDateError("") }}
                            />
                            {addDateError && (
                                <p className="text-sm text-destructive">{addDateError}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmAdd}
                            disabled={createMutation.isPending || !addPhone.trim() || !addBlockedUntil}
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Blocked ANI</DialogTitle>
                        <DialogDescription>
                            Modify the phone number or the blocked until date.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit-phone">Phone Number</Label>
                            <Input
                                id="edit-phone"
                                placeholder="+17871234567"
                                value={editPhone}
                                maxLength={12}
                                onChange={(e) => { setEditPhone(e.target.value); setEditPhoneError("") }}
                            />
                            {editPhoneError && (
                                <p className="text-sm text-destructive">{editPhoneError}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-blocked-until">Blocked Until</Label>
                            <Input
                                id="edit-blocked-until"
                                type="date"
                                value={editBlockedUntil}
                                onChange={(e) => { setEditBlockedUntil(e.target.value); setEditDateError("") }}
                            />
                            {editDateError && (
                                <p className="text-sm text-destructive">{editDateError}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmEdit}
                            disabled={updateMutation.isPending || !editPhone.trim() || !editBlockedUntil}
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unblock ANI</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to unblock <span className="font-mono font-semibold">{deleteTarget?.phone_number}</span>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)} disabled={deleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Full-screen loading overlay during delete */}
            {deleteMutation.isPending && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
                    <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-6 shadow-lg">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium">Deleting blocked ANI...</p>
                    </div>
                </div>
            )}
        </PageLayout>
    )
}
