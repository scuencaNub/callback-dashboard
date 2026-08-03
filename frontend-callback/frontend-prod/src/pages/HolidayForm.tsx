import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useIntl } from "react-intl"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog"
import { Button } from "../components/ui/button"
import { Calendar } from "../components/ui/calendar"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Switch } from "../components/ui/switch"
import { useCreateHoliday } from "../hooks/queries/useCreateHoliday"
import type { Holiday, QueueOverride } from "../hooks/queries/useGetHolidays"
import { useUpdateHoliday } from "../hooks/queries/useUpdateHoliday"
import { convertLocalToUTC, convertUTCToLocal } from "../lib/timeConversion"
import { useDataStore } from "../stores/useDataStore"
import type { Queue } from "../types"

// Helper function to parse date string (YYYY-MM-DD) as local date, not UTC
const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
}

// Convert queue_overrides from array to object format
// Converts UTC times from backend to UTC-4 for display
const arrayToObject = (overrides: QueueOverride[] | undefined): Record<string, { enabled?: boolean; start_time_asap?: string; stop_time_asap?: string }> => {
    if (!overrides || overrides.length === 0) return {}
    return overrides.reduce((acc, override) => {
        acc[override.queue_name] = {
            enabled: override.enabled,
            // Convert UTC to UTC-4 for display when editing
            start_time_asap: override.start_time_asap ? convertUTCToLocal(override.start_time_asap) : undefined,
            stop_time_asap: override.stop_time_asap ? convertUTCToLocal(override.stop_time_asap) : undefined,
        }
        return acc
    }, {} as Record<string, { enabled?: boolean; start_time_asap?: string; stop_time_asap?: string }>)
}

export interface HolidayFormValues {
    date: Date | null
    name: string
    type: "disable" | "schedule" | "partial"
    description: string
    queue_overrides: Record<string, {
        enabled?: boolean
        start_time_asap?: string
        stop_time_asap?: string
    }>
}

interface HolidayFormProps {
    holidays: Holiday[]
    onSuccess?: () => void
    editingHoliday?: Holiday | null
    onCloseEdit?: () => void
    editDisabled?: boolean
}

export const HolidayForm = ({ holidays: _holidays, onSuccess, editingHoliday, onCloseEdit, editDisabled }: HolidayFormProps) => {
    const { formatMessage: t } = useIntl()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const createHolidayMutation = useCreateHoliday()
    const updateHolidayMutation = useUpdateHoliday()
    const queues = useDataStore((state) => state.queues)

    const initialValues: HolidayFormValues = useMemo(() => ({
        date: null,
        name: "",
        type: "disable",
        description: "",
        queue_overrides: {},
    }), [])

    const [values, setValues] = useState<HolidayFormValues>(initialValues)

    const openCreateDialog = () => {
        setValues(initialValues)
        setError(null)
        setIsDialogOpen(true)
    }

    const openEditDialog = (h: Holiday) => {
        // Convert queue_overrides from array to object
        const queueOverrides = arrayToObject(h.queue_overrides)

        // Determine type based on configuration_type
        let type: "disable" | "schedule" | "partial" = "disable"
        if (h.configuration_type === "Only allow scheduled callbacks") {
            type = "schedule"
        } else if (h.configuration_type === "Partial operation") {
            type = "partial"
        }

        setValues({
            date: h.date ? parseLocalDate(h.date) : null,
            name: h.name,
            type,
            description: h.description || "",
            queue_overrides: queueOverrides,
        })
        setError(null)
        setIsDialogOpen(true)
    }

    const closeDialog = () => {
        setIsDialogOpen(false)
        setError(null)
        onCloseEdit?.()
    }

    useEffect(() => {
        if (editingHoliday) {
            openEditDialog(editingHoliday)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingHoliday])

    const handleSubmit = async () => {
        if (!values.date || !values.name) return

        setError(null)
        const iso = format(values.date, "yyyy-MM-dd")

        try {
            // Map type to configuration_type
            let configuration_type: "Completely disable callbacks" | "Only allow scheduled callbacks" | "Partial operation"
            if (values.type === "schedule") {
                configuration_type = "Only allow scheduled callbacks"
            } else if (values.type === "partial") {
                configuration_type = "Partial operation"
            } else {
                configuration_type = "Completely disable callbacks"
            }

            // Clean up queue_overrides: format according to backend expectations
            const cleanedOverrides: Record<string, { enabled?: boolean; start_time_asap?: string; stop_time_asap?: string }> = {}
            for (const [queueName, override] of Object.entries(values.queue_overrides)) {
                // Only include entries that have been explicitly configured
                if (override.enabled === undefined && !override.start_time_asap && !override.stop_time_asap) {
                    // Skip entries that haven't been configured
                    continue
                }

                if (override.enabled === false) {
                    // When disabled, only send enabled: false (no time fields)
                    cleanedOverrides[queueName] = { enabled: false }
                } else {
                    // When enabled or partially configured, include all relevant fields
                    const cleaned: { enabled?: boolean; start_time_asap?: string; stop_time_asap?: string } = {}
                    if (override.enabled !== undefined) {
                        cleaned.enabled = override.enabled
                    }
                    if (override.start_time_asap) {
                        // Convert from UTC-4 (user input) to UTC (backend format)
                        cleaned.start_time_asap = convertLocalToUTC(override.start_time_asap).substring(0, 5)
                    }
                    if (override.stop_time_asap) {
                        // Convert from UTC-4 (user input) to UTC (backend format)
                        cleaned.stop_time_asap = convertLocalToUTC(override.stop_time_asap).substring(0, 5)
                    }
                    cleanedOverrides[queueName] = cleaned
                }
            }

            if (editingHoliday) {
                // Update existing holiday
                await updateHolidayMutation.mutateAsync({
                    date: editingHoliday.date,
                    payload: {
                        name: values.name,
                        description: values.description,
                        configuration_type,
                        queue_overrides: Object.keys(cleanedOverrides).length > 0 ? cleanedOverrides : undefined,
                    },
                })
            } else {
                // Create new holiday
                await createHolidayMutation.mutateAsync({
                    date: iso,
                    name: values.name,
                    description: values.description,
                    configuration_type,
                    queue_overrides: Object.keys(cleanedOverrides).length > 0 ? cleanedOverrides : undefined,
                })
            }

            setIsDialogOpen(false)
            onSuccess?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save holiday")
        }
    }

    const updateQueueOverride = (queueName: string, field: "enabled" | "start_time_asap" | "stop_time_asap", value: boolean | string) => {
        setValues((prev) => ({
            ...prev,
            queue_overrides: {
                ...prev.queue_overrides,
                [queueName]: {
                    ...prev.queue_overrides[queueName],
                    [field]: value,
                },
            },
        }))
    }

    const isSubmitting = createHolidayMutation.isPending || updateHolidayMutation.isPending

    // Check if at least one queue is enabled when type is "partial"
    const hasEnabledQueue = values.type === "partial"
        ? Object.values(values.queue_overrides).some(override => override.enabled === true)
        : true

    return (
        <>
            <Button size="sm" onClick={openCreateDialog} disabled={editDisabled}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {t({ id: 'holidays.addHoliday', defaultMessage: 'Add holiday' })}
            </Button>

            <AlertDialog open={isDialogOpen} onOpenChange={closeDialog}>
                <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {editingHoliday ? t({ id: 'holidays.editHoliday', defaultMessage: 'Edit holiday' }) : t({ id: 'holidays.addHoliday', defaultMessage: 'Add holiday' })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {editingHoliday
                                ? t({ id: 'holidays.editHolidayDescription', defaultMessage: 'Update holiday data' })
                                : t({ id: 'holidays.addHolidayDescription', defaultMessage: 'Create a new holiday' })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-4 py-2">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>{t({ id: 'holidays.date', defaultMessage: 'Date' })}</Label>
                            <div className="relative">
                                <Button variant="outline" className="w-full justify-start text-left font-normal" type="button" onClick={() => setIsCalendarOpen((v) => !v)} disabled={!!editingHoliday}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {values.date ? format(values.date, "PPP", { locale: es }) : <span>{t({ id: 'holidays.selectDate', defaultMessage: 'Select a date' })}</span>}
                                </Button>
                                {isCalendarOpen && !editingHoliday && (
                                    <div className="absolute top-full left-0 z-50 mt-1">
                                        <Calendar
                                            mode="single"
                                            selected={values.date ?? undefined}
                                            onSelect={(d) => {
                                                setValues((v) => ({ ...v, date: d ?? null }))
                                                setIsCalendarOpen(false)
                                            }}
                                            initialFocus
                                            className="rounded-md border bg-background shadow-lg"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="holiday-name">{t({ id: 'holidays.name', defaultMessage: 'Name' })}</Label>
                            <Input id="holiday-name" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} placeholder={t({ id: 'holidays.namePlaceholder', defaultMessage: 'Holiday name' })} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="holiday-desc">{t({ id: 'holidays.description', defaultMessage: 'Description' })}</Label>
                            <Input id="holiday-desc" value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} placeholder={t({ id: 'holidays.descriptionPlaceholder', defaultMessage: 'Optional description' })} />
                        </div>

                        <div className="grid gap-2 max-w-xs">
                            <Label>{t({ id: 'holidays.configurationType', defaultMessage: 'Type' })}</Label>
                            <Select value={values.type} onValueChange={(v) => setValues((cur) => ({ ...cur, type: v as HolidayFormValues["type"] }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="disable">{t({ id: 'holidays.disableCallbacks', defaultMessage: 'Disable callbacks' })}</SelectItem>
                                    <SelectItem value="partial">Partial operation</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {values.type === "partial" && queues.length > 0 && (
                            <div className="grid gap-4 border-t pt-4">
                                <Label>Queue Overrides</Label>
                                <div className="space-y-4 max-h-64 overflow-y-auto">
                                    {queues.map((queue: Queue) => {
                                        const override = values.queue_overrides[queue.name] || {}
                                        const enabled = override.enabled ?? false

                                        return (
                                            <div key={queue.id} className="border rounded-lg p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label className="font-semibold">{queue.name}</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor={`queue-${queue.id}-enabled`} className="text-sm font-normal">Enabled</Label>
                                                        <Switch
                                                            id={`queue-${queue.id}-enabled`}
                                                            checked={enabled}
                                                            onCheckedChange={(checked) => updateQueueOverride(queue.name, "enabled", checked)}
                                                        />
                                                    </div>
                                                </div>
                                                {enabled && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor={`queue-${queue.id}-start`} className="text-sm">Start Time (HH:mm)</Label>
                                                            <Input
                                                                id={`queue-${queue.id}-start`}
                                                                type="time"
                                                                value={override.start_time_asap || ""}
                                                                onChange={(e) => updateQueueOverride(queue.name, "start_time_asap", e.target.value)}
                                                                placeholder="08:00"
                                                            />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor={`queue-${queue.id}-stop`} className="text-sm">Stop Time (HH:mm)</Label>
                                                            <Input
                                                                id={`queue-${queue.id}-stop`}
                                                                type="time"
                                                                value={override.stop_time_asap || ""}
                                                                onChange={(e) => updateQueueOverride(queue.name, "stop_time_asap", e.target.value)}
                                                                placeholder="17:00"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                            {t({ id: 'common.cancel', defaultMessage: 'Cancel' })}
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting || !values.date || !values.name || !hasEnabledQueue}>
                            {isSubmitting
                                ? t({ id: 'common.saving', defaultMessage: 'Saving...' })
                                : editingHoliday
                                    ? t({ id: 'holidays.saveChanges', defaultMessage: 'Save changes' })
                                    : t({ id: 'holidays.addHoliday', defaultMessage: 'Add holiday' })}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export default HolidayForm

