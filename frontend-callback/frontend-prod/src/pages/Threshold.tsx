import { AlertCircle, ArrowDownCircle, ArrowUpCircle, Check, Power, PowerOff, Save, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useIntl } from "react-intl"
import { PageLayout } from "../components/pageLayout"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group"
import { Slider } from "../components/ui/slider"
import { Switch } from "../components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { useThresholdConfiguration } from "../hooks/queries/useThresholdConfiguration"
import { useUpdateThresholdConfiguration } from "../hooks/queries/useUpdateThresholdConfiguration"
import { convertLocalToUTC, convertUTCToLocal } from "../lib/timeConversion"
import { useDataStore } from "../stores/useDataStore"

type ThresholdConfig = {
    status: boolean
    mode: "AUTO" | "MANUAL"
    activation_threshold: number
    deactivation_threshold: number
    currentQueueCalls: number
    priority_mode?: "AGENT" | "CUSTOMER"
    schedule_programming: { day: string; start_at: string; end_at: string; status: boolean }[]
}

import { useAuth } from "../components/auth/AuthProvider"

// Set to true to show the Operation Mode tab
const SHOW_OPERATION_MODE_TAB = false

export default function Threshold() {
    const { formatMessage: t } = useIntl()
    const { canEdit } = useAuth()
    const editDisabled = !canEdit

    const [showSuccess, setShowSuccess] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")
    const [showError, setShowError] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [showConfirmSave, setShowConfirmSave] = useState(false)
    const [showConfirmToggle, setShowConfirmToggle] = useState(false)
    const { pendingCallbacksCount } = useDataStore()

    const { data, isLoading } = useThresholdConfiguration()
    const updateMutation = useUpdateThresholdConfiguration()

    const [draft, setDraft] = useState<ThresholdConfig | null>(null)
    const [originalData, setOriginalData] = useState<ThresholdConfig | null>(null)

    const convertDataForDisplay = useCallback((data: any): ThresholdConfig => {
        return {
            ...data,
            mode: data.mode === "AUTOMATIC" ? "AUTO" : "MANUAL" as "AUTO" | "MANUAL",
            schedule_programming: data.schedule_programming?.map((schedule: any) => ({
                ...schedule,
                start_at: schedule.start_at ? convertUTCToLocal(schedule.start_at) : schedule.start_at,
                end_at: schedule.end_at ? convertUTCToLocal(schedule.end_at) : schedule.end_at
            })) || []
        }
    }, [])

    useEffect(() => {
        if (data) {
            const convertedData = convertDataForDisplay(data)
            setDraft(convertedData)
            setOriginalData(convertedData)
        }
    }, [data, convertDataForDisplay])

    const hasChanges = useCallback((): boolean => {
        if (!draft || !originalData) return false

        // Compare schedule_programming deeply
        const scheduleChanged = JSON.stringify(draft.schedule_programming) !== JSON.stringify(originalData.schedule_programming)

        // Compare other fields
        const otherFieldsChanged =
            draft.status !== originalData.status ||
            draft.mode !== originalData.mode ||
            draft.activation_threshold !== originalData.activation_threshold ||
            draft.deactivation_threshold !== originalData.deactivation_threshold ||
            draft.priority_mode !== originalData.priority_mode

        return scheduleChanged || otherFieldsChanged
    }, [draft, originalData])

    useEffect(() => {
        if (!draft) return

        if (draft.deactivation_threshold >= draft.activation_threshold) {
            setErrorMessage("El threshold de apagado debe ser menor que el de encendido")
            setShowError(true)
        } else {
            setShowError(false)
        }
    }, [draft?.activation_threshold, draft?.deactivation_threshold])

    const validateThresholds = useCallback(() => {
        if (draft?.deactivation_threshold && draft?.activation_threshold && draft.deactivation_threshold >= draft.activation_threshold) {
            setErrorMessage("El threshold de apagado debe ser menor que el de encendido")
            setShowError(true)
            return false
        }
        return true
    }, [draft?.deactivation_threshold, draft?.activation_threshold])

    const handleModeChange = useCallback((newMode: "AUTO" | "MANUAL") => {
        setDraft((prev) => (prev ? { ...prev, mode: newMode } : prev))
    }, [])

    const handleThresholdOnChange = useCallback((value: number) => {
        setShowError(false)
        setDraft((prev) => (prev ? { ...prev, activation_threshold: value } : prev))
    }, [])

    const handleThresholdOffChange = useCallback((value: number) => {
        setShowError(false)
        setDraft((prev) => (prev ? { ...prev, deactivation_threshold: value } : prev))
    }, [])

    const updateScheduledTime = useCallback((index: number, field: string, value: any) => {
        setDraft((prev) => {
            if (!prev) return prev
            const arr = [...prev.schedule_programming]
            arr[index] = { ...arr[index], [field]: value }
            return { ...prev, schedule_programming: arr }
        })
    }, [])

    const toggleActiveState = async () => {
        if (!draft) return

        const updatedDraft = { ...draft, status: !draft.status }
        setDraft(updatedDraft)

        try {
            const payload = {
                status: updatedDraft.status,
                mode: updatedDraft.mode === "AUTO" ? "AUTOMATIC" : "MANUAL" as "AUTOMATIC" | "MANUAL",
                activation_threshold: updatedDraft.activation_threshold,
                deactivation_threshold: updatedDraft.deactivation_threshold,
                priority_mode: (updatedDraft.priority_mode || "CUSTOMER") as "AGENT" | "CUSTOMER",
                schedule_programming: updatedDraft.schedule_programming.map(s => ({
                    day: s.day,
                    start_at: s.start_at ? convertLocalToUTC(s.start_at) : null,
                    end_at: s.end_at ? convertLocalToUTC(s.end_at) : null,
                    status: s.status
                }))
            }

            await updateMutation.mutateAsync(payload)
            setShowConfirmToggle(false)
            setSuccessMessage(updatedDraft.status ? "Callback service activated successfully" : "Callback service deactivated successfully")
            setShowSuccess(true)

            // Update originalData to match the saved draft
            setOriginalData(updatedDraft)

            setTimeout(() => {
                setShowSuccess(false)
                setSuccessMessage("")
            }, 3000)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Failed to update configuration")
            setShowError(true)
            // Revert the change on error
            setDraft(draft)
        }
    }

    const handleCancel = useCallback(() => {
        if (originalData) {
            setDraft(originalData)
            setShowError(false)
        }
    }, [originalData])

    const saveConfiguration = async () => {
        if (!validateThresholds() || !draft) return

        try {
            const payload = {
                status: draft.status,
                mode: draft.mode === "AUTO" ? "AUTOMATIC" : "MANUAL" as "AUTOMATIC" | "MANUAL",
                activation_threshold: draft.activation_threshold,
                deactivation_threshold: draft.deactivation_threshold,
                priority_mode: (draft.priority_mode || "CUSTOMER") as "AGENT" | "CUSTOMER",
                schedule_programming: draft.schedule_programming.map(s => ({
                    day: s.day,
                    start_at: s.start_at ? convertLocalToUTC(s.start_at) : null,
                    end_at: s.end_at ? convertLocalToUTC(s.end_at) : null,
                    status: s.status
                }))
            }

            await updateMutation.mutateAsync(payload)
            setShowConfirmSave(false)
            setSuccessMessage("Threshold configuration saved successfully")
            setShowSuccess(true)

            // Update originalData to match the saved draft, so button gets disabled again
            if (draft) {
                setOriginalData(draft)
            }

            setTimeout(() => {
                setShowSuccess(false)
                setSuccessMessage("")
            }, 3000)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Failed to save configuration")
            setShowError(true)
        }
    }

    return (
        <PageLayout
            title={t({ id: 'threshold.title' })}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>{t({ id: 'threshold.currentStatus' })}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center p-6 border rounded-lg">
                                <div className={`text-2xl font-bold mb-2 ${draft?.status ? "text-green-500" : "text-red-500"}`}>
                                    {draft?.status ? "ACTIVE" : "INACTIVE"}
                                </div>
                                <div className="text-sm text-muted-foreground">{t({ id: 'threshold.callbackService' })}</div>
                                <div className="mt-4">
                                    <AlertDialog open={showConfirmToggle} onOpenChange={setShowConfirmToggle}>
                                        <AlertDialogTrigger asChild>
                                            {draft?.status ? <Button variant="destructive" className="gap-2" disabled={editDisabled}>
                                                <PowerOff className="h-4 w-4" />
                                                {t({ id: 'threshold.deactivateCurrent' })}
                                            </Button> :
                                                <Button variant="default" className="gap-2" disabled={editDisabled}>
                                                    <Power className="h-4 w-4" />
                                                    {t({ id: 'threshold.activateCurrent' })}
                                                </Button>}
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>
                                                    {draft?.status ? t({ id: 'threshold.confirmDeactivateTitle' }) : t({ id: 'threshold.confirmActivateTitle' })}
                                                </AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    {draft?.status
                                                        ? t({ id: 'threshold.confirmDeactivateDesc' })
                                                        : t({ id: 'threshold.confirmActivateDesc' })}
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>{t({ id: 'common.cancel' })}</AlertDialogCancel>
                                                <AlertDialogAction onClick={toggleActiveState}>
                                                    {draft?.status ? "Desactivar" : "Activar"}
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium">{t({ id: 'threshold.currentMode' })}</Label>
                                    <div className="text-lg font-semibold mt-1">{draft?.mode === "AUTO" ? t({ id: 'threshold.automatic' }) : t({ id: 'threshold.manual' })}</div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium">{t({ id: 'threshold.callsInQueue' })}</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="text-2xl font-bold">{pendingCallbacksCount}</div>
                                        {draft?.mode === "AUTO" && (
                                            <div className="text-xs text-muted-foreground">
                                                {pendingCallbacksCount >= draft?.activation_threshold ? (
                                                    <span className="text-green-500 flex items-center">
                                                        <ArrowUpCircle className="h-3 w-3 mr-1" />
                                                        {t({ id: 'threshold.aboveActivation' })}
                                                    </span>
                                                ) : pendingCallbacksCount <= draft?.deactivation_threshold ? (
                                                    <span className="text-red-500 flex items-center">
                                                        <ArrowDownCircle className="h-3 w-3 mr-1" />
                                                        {t({ id: 'threshold.belowDeactivation' })}
                                                    </span>
                                                ) : (
                                                    <span className="text-yellow-500">{t({ id: 'threshold.betweenThresholds' })}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {draft?.mode === "AUTO" && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>
                                                {t({ id: 'threshold.deactivationThreshold' })}: <strong>{draft?.deactivation_threshold}</strong>
                                            </span>
                                            <span>
                                                {t({ id: 'threshold.activationThreshold' })}: <strong>{draft?.activation_threshold}</strong>
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                                                style={{ width: "100%" }}
                                            />
                                        </div>
                                        <div
                                            className="h-4 w-4 bg-blue-500 rounded-full relative"
                                            style={{
                                                marginLeft: `${Math.min(100, Math.max(0, ((pendingCallbacksCount ?? 0) / Math.max(draft?.activation_threshold ?? 15, 15)) * 100))}%`,
                                                marginTop: "-14px",
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Threshold Configuration</CardTitle>
                        <CardDescription>Define how and when the Callback service is activated or deactivated</CardDescription>
                    </CardHeader>
                    <CardContent className="md:h-[600px] md:overflow-y-auto">
                        <Tabs defaultValue={SHOW_OPERATION_MODE_TAB ? "mode" : "schedule"}>
                            {SHOW_OPERATION_MODE_TAB && (
                                <TabsList className="mb-4">
                                    <TabsTrigger value="mode">Operation Mode</TabsTrigger>
                                    <TabsTrigger value="schedule">Schedule</TabsTrigger>
                                </TabsList>
                            )}

                            {SHOW_OPERATION_MODE_TAB && (
                                <TabsContent value="mode" className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-base font-medium">Select operation mode</Label>
                                            <RadioGroup
                                                value={draft?.mode}
                                                onValueChange={(value) => handleModeChange(value as "AUTO" | "MANUAL")}
                                                className="mt-2 space-y-4"
                                                disabled={editDisabled}
                                            >
                                                <div className="flex items-start space-x-2">
                                                    <RadioGroupItem value="AUTO" id="mode-AUTO" />
                                                    <div className="grid gap-1.5">
                                                        <Label htmlFor="mode-AUTO" className="font-medium">
                                                            Automatic Mode
                                                        </Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            The system will automatically activate or deactivate the Callback service based on the
                                                            number of calls in queue.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start space-x-2">
                                                    <RadioGroupItem value="MANUAL" id="mode-MANUAL" />
                                                    <div className="grid gap-1.5">
                                                        <Label htmlFor="mode-MANUAL" className="font-medium">
                                                            Manual Mode
                                                        </Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            The Callback service will be activated or deactivated manually or according to scheduled
                                                            times.
                                                        </p>
                                                    </div>
                                                </div>
                                            </RadioGroup>
                                        </div>

                                        {draft?.mode === "AUTO" && (
                                            <div className="space-y-6 p-4 border rounded-lg mt-4">
                                                <div>
                                                    <div className="flex justify-between mb-2">
                                                        <Label htmlFor="threshold-on" className="font-medium">
                                                            {t({ id: 'threshold.activationThreshold' })}
                                                        </Label>
                                                        <span className="text-sm text-muted-foreground">Current value: {draft?.activation_threshold}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <Slider
                                                            id="threshold-on"
                                                            min={1}
                                                            max={50}
                                                            step={1}
                                                            value={[draft?.activation_threshold ?? 0]}
                                                            onValueChange={(value) => handleThresholdOnChange(value[0])}
                                                            className="flex-1"
                                                        />
                                                        <Input
                                                            type="number"
                                                            value={draft?.activation_threshold}
                                                            onChange={(e) => handleThresholdOnChange(Number.parseInt(e.target.value) || 0)}
                                                            className="w-20"
                                                            min={1}
                                                            max={50}
                                                        />
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {t({ id: 'threshold.activationHelper' })}
                                                    </p>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between mb-2">
                                                        <Label htmlFor="threshold-off" className="font-medium">
                                                            {t({ id: 'threshold.deactivationThreshold' })}
                                                        </Label>
                                                        <span className="text-sm text-muted-foreground">Current value: {draft?.deactivation_threshold}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <Slider
                                                            id="threshold-off"
                                                            min={0}
                                                            max={(draft?.activation_threshold ?? 1) - 1}
                                                            step={1}
                                                            value={[draft?.deactivation_threshold]}
                                                            onValueChange={(value) => handleThresholdOffChange(value[0])}
                                                            className="flex-1"
                                                        />
                                                        <Input
                                                            type="number"
                                                            value={draft?.deactivation_threshold}
                                                            onChange={(e) => handleThresholdOffChange(Number.parseInt(e.target.value) || 0)}
                                                            className="w-20"
                                                            min={0}
                                                            max={(draft?.activation_threshold ?? 1) - 1}
                                                        />
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {t({ id: 'threshold.deactivationHelper' })}
                                                    </p>
                                                </div>

                                                <div className="bg-muted/50 p-4 rounded-lg">
                                                    <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                                                        <AlertCircle className="h-4 w-4 text-blue-500" />
                                                        {t({ id: 'threshold.systemBehavior' })}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {t({ id: 'threshold.systemBehaviorText' }, { on: draft?.activation_threshold, off: draft?.deactivation_threshold })}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            )}

                            <TabsContent value="schedule" className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base font-medium">{t({ id: 'threshold.scheduleProgramming' })}</Label>
                                        <div className="text-sm text-muted-foreground">
                                            {draft?.mode === "MANUAL" ? t({ id: 'threshold.scheduleStateActive' }) : t({ id: 'threshold.scheduleStateManualOnly' })}
                                        </div>
                                    </div>
                                    {isLoading ? <div>Loading...</div> :
                                        <div className={`space-y-4 ${draft?.mode !== "MANUAL" ? "opacity-50 pointer-events-none" : ""}`}>
                                            {draft?.schedule_programming?.map((schedule: any, index: number) => (
                                                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                                        <div className="md:col-span-2">
                                                            <Label className="text-sm font-medium">{schedule.day?.toLowerCase().charAt(0).toUpperCase() + schedule.day?.toLowerCase().slice(1)}</Label>
                                                        </div>
                                                        <div>
                                                            <Label htmlFor={`start-time-${index}`} className="text-xs text-muted-foreground">
                                                                {t({ id: 'threshold.endTime' })}
                                                            </Label>
                                                            <Input
                                                                id={`start-time-${index}`}
                                                                type="time"
                                                                value={schedule.start_at}
                                                                onChange={(e) => updateScheduledTime(index, "start_at", e.target.value)}
                                                                disabled={!schedule.status}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor={`end-time-${index}`} className="text-xs text-muted-foreground">
                                                                {t({ id: 'threshold.startTime' })}
                                                            </Label>
                                                            <Input
                                                                id={`end-time-${index}`}
                                                                type="time"
                                                                value={schedule.end_at}
                                                                onChange={(e) => updateScheduledTime(index, "end_at", e.target.value)}
                                                                disabled={!schedule.status}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={schedule.status}
                                                            onCheckedChange={(checked) => updateScheduledTime(index, "status", checked)}
                                                            disabled={editDisabled}
                                                        />
                                                        <Label className="text-sm">{schedule.status ? "Active" : "Inactive"}</Label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={handleCancel}
                            disabled={!hasChanges() || editDisabled}
                        >
                            {t({ id: 'common.cancel' })}
                        </Button>
                        <AlertDialog open={showConfirmSave} onOpenChange={setShowConfirmSave}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    onClick={() => {
                                        if (validateThresholds()) {
                                            setShowConfirmSave(true)
                                        }
                                    }}
                                    disabled={!hasChanges() || editDisabled}
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {t({ id: 'threshold.saveConfig' })}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm changes?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You are about to save the threshold configuration for the Callback service. This action will affect
                                        the system's behavior.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t({ id: 'common.cancel' })}</AlertDialogCancel>
                                    <AlertDialogAction onClick={saveConfiguration}>Confirmar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            </div>

            {showSuccess && (
                <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center shadow-lg">
                    <Check className="h-5 w-5 mr-2" />
                    <span>{successMessage}</span>
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
        </PageLayout>
    )
}
