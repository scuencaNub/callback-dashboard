import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Edit, Eye, Loader2, Trash2 } from "lucide-react"
import { useState } from "react"
import { useIntl } from "react-intl"
import { useAuth } from "../components/auth/AuthProvider"
import { PageLayout } from "../components/pageLayout"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog"
import { Button } from "../components/ui/button"
import { Calendar } from "../components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { config } from "../config/env"
import { getIdToken } from "../lib/auth-helpers"
import { useGetHolidays, type Holiday, type QueueOverride } from "../hooks/queries/useGetHolidays"
import { useQueues } from "../hooks/queries/useQueues"
import { convertUTCToLocal } from "../lib/timeConversion"
import HolidayForm from "./HolidayForm"

// Helper function to parse date string (YYYY-MM-DD) as local date, not UTC
const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
}


export default function Holidays() {
    const intl = useIntl()
    const { canEdit } = useAuth()
    const editDisabled = !canEdit
    // Use the real hook instead of mock data
    const { data: holidaysData = [], isLoading, error, refetch } = useGetHolidays()
    // Load queues to populate the store for HolidayForm
    useQueues()
    // Local state reserved for future optimistic updates (currently unused)
    const [localHolidays] = useState<Holiday[]>([])
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
    const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null)
    const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null)

    // Use real data when available, fallback to local state for optimistic updates
    const holidays = holidaysData.length > 0 ? holidaysData : localHolidays

    const openEdit = (h: Holiday) => {
        setEditingHoliday(h)
    }

    const deleteHoliday = async (date: string) => {
        if (editDisabled) return

        try {
            const idToken = await getIdToken()

            const response = await fetch(`${config.updateHolidayCalendarUrl}/${date}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    "Content-Type": "application/json",
                },
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
            }

            // Refresh list after successful delete
            await refetch()
            setHolidayToDelete(null)
        } catch (error) {
            console.error("Failed to delete holiday:", error)
            // Opcional: podríamos mostrar un toast de error si más adelante agregamos notificaciones acá.
        }
    }

    const handleFormSuccess = () => {
        setEditingHoliday(null)
        // Refetch data after successful create/update
        refetch()
    }

    const handleCloseEdit = () => setEditingHoliday(null)

    const openOverrides = (h: Holiday) => {
        setSelectedHoliday(h)
    }

    const closeOverrides = () => setSelectedHoliday(null)

    return (
        <PageLayout
            title={intl.formatMessage({ id: 'sidebar.holidays' })}
            description="Manage holidays and system behavior on those dates"
        >
            <div className="grid gap-6 md:grid-cols-5">
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Holidays Calendar</CardTitle>
                            <CardDescription>Configured holidays in your contact center</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full overflow-hidden calendar-container">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : error ? (
                                <div className="flex items-center justify-center h-64 text-red-500">
                                    <p>Error loading holidays: {error.message}</p>
                                </div>
                            ) : (
                                <Calendar
                                    mode="single"
                                    selected={new Date()}
                                    onSelect={() => { }}
                                    className="rounded-md border w-full max-w-full min-w-0 responsive-calendar"
                                    modifiers={{
                                        holiday: holidays.map((h) => parseLocalDate(h.date)),
                                    }}
                                    modifiersStyles={{
                                        holiday: {
                                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                                            color: "rgb(239, 68, 68)",
                                            fontWeight: "bold",
                                        },
                                    }}
                                    locale={es}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3">
                    <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                            <CardTitle>Configured Holidays</CardTitle>
                            <HolidayForm
                                holidays={holidays}
                                onSuccess={handleFormSuccess}
                                editingHoliday={editingHoliday}
                                onCloseEdit={handleCloseEdit}
                                editDisabled={editDisabled}
                            />
                        </div>
                        <CardDescription>List of holidays and their configuration</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center">
                                                <div className="flex items-center justify-center">
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    Loading holidays...
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : error ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-red-500">
                                                Error loading holidays: {error.message}
                                            </TableCell>
                                        </TableRow>
                                    ) : holidays.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">No holidays configured</TableCell>
                                        </TableRow>
                                    ) : (
                                        holidays.sort((a, b) => a.date.localeCompare(b.date)).map((holiday) => (
                                            <TableRow key={holiday.date}>
                                                <TableCell className="whitespace-nowrap">{format(parseLocalDate(holiday.date), "dd/MM/yyyy")}</TableCell>
                                                <TableCell className="whitespace-nowrap">{holiday.name}</TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {holiday.configuration_type === "Completely disable callbacks"
                                                        ? "Disable callbacks"
                                                        : holiday.configuration_type === "Only allow scheduled callbacks"
                                                            ? "Scheduled only"
                                                            : "Partial operation"}
                                                </TableCell>
                                                <TableCell className="text-right whitespace-nowrap space-x-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openOverrides(holiday)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(holiday)} disabled={editDisabled}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setHolidayToDelete(holiday)}
                                                        disabled={editDisabled}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={!!selectedHoliday} onOpenChange={(open) => !open && closeOverrides()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Queue overrides for {selectedHoliday?.name}</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="max-h-80 overflow-y-auto mt-2">
                        {selectedHoliday?.queue_overrides && selectedHoliday.queue_overrides.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Queue</TableHead>
                                        <TableHead>Enabled</TableHead>
                                        <TableHead>Start ASAP</TableHead>
                                        <TableHead>Stop ASAP</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedHoliday.queue_overrides.map((qo: QueueOverride) => (
                                        <TableRow key={qo.queue_name}>
                                            <TableCell>{qo.queue_name}</TableCell>
                                            <TableCell>{qo.enabled ? "Yes" : "No"}</TableCell>
                                            <TableCell>{qo.enabled ? (qo.start_time_asap ? convertUTCToLocal(qo.start_time_asap) : "-") : "-"}</TableCell>
                                            <TableCell>{qo.enabled ? (qo.stop_time_asap ? convertUTCToLocal(qo.stop_time_asap) : "-") : "-"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-sm text-muted-foreground">No queue overrides configured for this holiday.</p>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={closeOverrides}>Close</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete confirmation dialog */}
            <AlertDialog open={!!holidayToDelete} onOpenChange={(open) => !open && setHolidayToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete holiday</AlertDialogTitle>
                    </AlertDialogHeader>
                    <p className="text-sm text-muted-foreground mt-2">
                        Are you sure you want to delete the holiday{" "}
                        <span className="font-semibold">{holidayToDelete?.name}</span> on{" "}
                        {holidayToDelete ? format(parseLocalDate(holidayToDelete.date), "dd/MM/yyyy") : ""}?
                    </p>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setHolidayToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                if (holidayToDelete) {
                                    void deleteHoliday(holidayToDelete.date)
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* showSuccess and showError are omitted here. */}
        </PageLayout>
    )
}
