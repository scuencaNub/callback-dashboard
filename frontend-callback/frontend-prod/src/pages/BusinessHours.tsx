import { AlarmClock, AlertCircle, CheckCircle, Clock, Info, Save, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useIntl } from "react-intl"
import { useAuth } from "../components/auth/AuthProvider"
import { PageLayout } from "../components/pageLayout"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Switch } from "../components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { useQueueConfiguration } from "../hooks/queries/useQueueConfiguration"
import { useUpdateQueueConfiguration } from "../hooks/queries/useUpdateQueueConfiguration"
import { convertLocalToUTC, convertUTCToLocal } from "../lib/timeConversion"

interface QueueDraft {
    allowed_callback_type: string
    allow_only_next_day: boolean
    business_hours_custom_message: string
    business_hours_enable: boolean
    start_time_asap?: string | null
    stop_time_asap?: string | null
}

// Set to true to show the Configuration tab
const SHOW_CONFIGURATION_TAB = false

export default function BusinessHours() {
    const intl = useIntl()
    const { canEdit } = useAuth()
    const editDisabled = !canEdit

    const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)
    const [showError, setShowError] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [_isLoading, setIsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<string>("hours")
    const [queueDraft, setQueueDraft] = useState<QueueDraft | null>(null)
    const [showQueueChangeDialog, setShowQueueChangeDialog] = useState(false)
    const [pendingQueueId, setPendingQueueId] = useState<string | null>(null)
    const [bypassHasChanges, setBypassHasChanges] = useState(false)

    const { queueConfigurations: queuesData = [] } = useQueueConfiguration()
    const updateMutation = useUpdateQueueConfiguration()

    const selectedQueueData = selectedQueue !== null
        ? queuesData.find((q: any) => q.queue_id === selectedQueue)
        : null

    useEffect(() => {
        if (selectedQueueData) {
            setQueueDraft({
                allowed_callback_type: selectedQueueData.allowed_callback_type,
                allow_only_next_day: selectedQueueData.allow_only_next_day,
                business_hours_custom_message: selectedQueueData.business_hours_custom_message,
                business_hours_enable: selectedQueueData.business_hours_enable,
                start_time_asap: selectedQueueData.start_time_asap ? convertUTCToLocal(selectedQueueData.start_time_asap) : null,
                stop_time_asap: selectedQueueData.stop_time_asap ? convertUTCToLocal(selectedQueueData.stop_time_asap) : null,
            })
        }
    }, [selectedQueueData])

    const isCallbackEnabled = (queue: any) => queue.allowed_callback_type === "ALLOW_SCHEDULING"

    const getConfigStatus = (queue: any) => {
        if (!isCallbackEnabled(queue)) return "No callbacks outside hours"
        return "Callbacks allowed outside hours"
    }

    const formatBusinessHours = (queue: any) => {
        if (!queue.business_hours_enable) return "Business hours disabled"
        if (queue.stop_time_asap_enable && queue.stop_time_asap) {
            return `From ${queue.start_time_asap} to ${queue.stop_time_asap}`
        }
        return "Business hours enabled"
    }

    const updateDraft = (field: keyof QueueDraft, value: any) => {
        if (!queueDraft) return
        setQueueDraft(prev => ({ ...prev!, [field]: value }))
    }

    const getCurrentQueue = (queue: any) => (selectedQueue === queue.queue_id && queueDraft ? { ...queue, ...queueDraft } : queue)

    const hasChanges = () => !!(selectedQueueData && queueDraft && (
        queueDraft.allowed_callback_type !== selectedQueueData.allowed_callback_type ||
        queueDraft.allow_only_next_day !== selectedQueueData.allow_only_next_day ||
        queueDraft.business_hours_custom_message !== selectedQueueData.business_hours_custom_message ||
        queueDraft.business_hours_enable !== selectedQueueData.business_hours_enable ||
        (queueDraft.start_time_asap && convertLocalToUTC(queueDraft.start_time_asap) !== selectedQueueData.start_time_asap) ||
        (queueDraft.stop_time_asap && convertLocalToUTC(queueDraft.stop_time_asap) !== selectedQueueData.stop_time_asap) ||
        (!queueDraft.start_time_asap && selectedQueueData.start_time_asap) ||
        (!queueDraft.stop_time_asap && selectedQueueData.stop_time_asap)
    ))

    const saveConfiguration = async () => {
        if (!selectedQueueData || !queueDraft || !selectedQueue) return

        setIsLoading(true)
        try {
            const payload: any = {}

            // Only include fields that have changed
            if (queueDraft.allowed_callback_type !== selectedQueueData.allowed_callback_type) {
                payload.allowed_callback_type = queueDraft.allowed_callback_type
            }
            if (queueDraft.allow_only_next_day !== selectedQueueData.allow_only_next_day) {
                payload.allow_only_next_day = queueDraft.allow_only_next_day
            }
            if (queueDraft.business_hours_custom_message !== selectedQueueData.business_hours_custom_message) {
                payload.business_hours_custom_message = queueDraft.business_hours_custom_message
            }
            if (queueDraft.business_hours_enable !== selectedQueueData.business_hours_enable) {
                payload.business_hours_enable = queueDraft.business_hours_enable
            }

            // Handle time fields - convert from UTC-4 to UTC for backend
            const currentStartTimeUTC = selectedQueueData.start_time_asap
            const newStartTimeUTC = queueDraft.start_time_asap ? convertLocalToUTC(queueDraft.start_time_asap) : null
            if (newStartTimeUTC !== currentStartTimeUTC) {
                payload.start_time_asap = newStartTimeUTC
            }

            const currentStopTimeUTC = selectedQueueData.stop_time_asap
            const newStopTimeUTC = queueDraft.stop_time_asap ? convertLocalToUTC(queueDraft.stop_time_asap) : null
            if (newStopTimeUTC !== currentStopTimeUTC) {
                payload.stop_time_asap = newStopTimeUTC
            }

            await updateMutation.mutateAsync({ queueName: selectedQueueData.queue_name, payload })

            setShowSuccess(true)
            setBypassHasChanges(true)
            setTimeout(() => setShowSuccess(false), 3000)
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Failed to save configuration")
            setShowError(true)
            setTimeout(() => setShowError(false), 5000)
        } finally {
            setIsLoading(false)
        }
    }

    const handleQueueSelection = (queueId: string) => {
        if (selectedQueue && hasChanges() && !bypassHasChanges) {
            setPendingQueueId(queueId)
            setShowQueueChangeDialog(true)
            return
        }
        setBypassHasChanges(false)
        setSelectedQueue(queueId)
        setQueueDraft(null)
    }

    const confirmQueueChange = () => {
        if (pendingQueueId) {
            setSelectedQueue(pendingQueueId)
            setQueueDraft(null)
            setPendingQueueId(null)
            setShowQueueChangeDialog(false)
        }
    }

    const cancelQueueChange = () => {
        setPendingQueueId(null)
        setShowQueueChangeDialog(false)
    }
    return (
        <PageLayout
            title={intl.formatMessage({ id: 'sidebar.businessHours' })}
            description="Configure system behavior when calls are received"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Queues
                        </CardTitle>
                        <CardDescription>Select a queue to configure its behavior</CardDescription>
                    </CardHeader>
                    <CardContent className="md:h-[600px] md:overflow-y-auto">
                        <div className="space-y-4">
                            {queuesData.map((queue: any) => {
                                const effective = getCurrentQueue(queue)
                                return (
                                    <div
                                        key={queue.queue_id}
                                        className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${selectedQueue === queue.queue_id ? "border-primary bg-muted/50" : ""}`}
                                        onClick={() => handleQueueSelection(queue.queue_id)}
                                    >
                                        <h3 className="font-medium mb-2 whitespace-nowrap">{queue.queue_name}</h3>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground">
                                                <span className="font-medium">Status:</span> {getConfigStatus(effective)}
                                            </p>
                                            <div className="pl-5">
                                                <Badge variant={effective.business_hours_enable ? "default" : "destructive"}>
                                                    {effective.business_hours_enable ? "Configured" : "Disabled"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedQueueData ? (
                            SHOW_CONFIGURATION_TAB ? (
                                <Tabs value={activeTab} onValueChange={setActiveTab}>
                                    <TabsList className="mb-4">
                                        <TabsTrigger value="config">Configuration</TabsTrigger>
                                        <TabsTrigger value="hours">Hours</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="config" className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-base font-medium">Allow Callbacks outside business hours</Label>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Enable this option to allow customers to request a callback outside business hours
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={queueDraft?.business_hours_enable || false}
                                                    onCheckedChange={(checked) => updateDraft("business_hours_enable", checked)}
                                                />
                                            </div>

                                            <div className={`space-y-4 p-4 border rounded-lg ${!queueDraft?.business_hours_enable ? "opacity-50 pointer-events-none" : ""}`}>
                                                <div className="max-w-xs">
                                                    <Label className="text-base font-medium">Allowed Callback type</Label>
                                                    <Select
                                                        value={queueDraft?.allowed_callback_type || "NO_CALLBACK"}
                                                        onValueChange={(value) => updateDraft("allowed_callback_type", value)}
                                                    >
                                                        <SelectTrigger className="mt-2">
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ALLOW_SCHEDULING">Only allow scheduling a Callback</SelectItem>
                                                            <SelectItem value="NO_CALLBACK">Do not allow Callbacks outside business hours</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {queueDraft?.allowed_callback_type === "ALLOW_SCHEDULING" && (
                                                    <div className="space-y-2 mt-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <Label className="text-sm font-medium">Only allow for the next business day</Label>
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    If enabled, scheduling will only be available for the next business day. If disabled,
                                                                    any day can be chosen.
                                                                </p>
                                                            </div>
                                                            <Switch
                                                                checked={queueDraft?.allow_only_next_day || false}
                                                                onCheckedChange={(checked) => updateDraft("allow_only_next_day", checked)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2 mt-4">
                                                    <Label htmlFor="message" className="text-sm font-medium">
                                                        Message for the customer
                                                    </Label>
                                                    <textarea
                                                        id="message"
                                                        className="w-full min-h-[80px] p-2 border rounded-md"
                                                        value={queueDraft?.business_hours_custom_message || ""}
                                                        onChange={(e) => updateDraft("business_hours_custom_message", e.target.value)}
                                                        placeholder="Mensaje que se mostrará al cliente cuando intente contactar fuera del horario laboral"
                                                    />
                                                </div>

                                                <div className="bg-muted/50 p-4 rounded-lg">
                                                    <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                                                        <Info className="h-4 w-4 text-blue-500" />
                                                        System behavior
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {queueDraft?.allowed_callback_type === "ALLOW_SCHEDULING" ? (
                                                            <>
                                                                With the current configuration, when a customer calls outside business hours,
                                                                <strong> they will only be able to schedule a callback</strong> for
                                                                {queueDraft?.allow_only_next_day ? " the next business day." : " any available day."}
                                                            </>
                                                        ) : (
                                                            <strong>No Callback option will be offered outside business hours.</strong>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="hours" className="space-y-6">
                                        <div className="space-y-4">
                                            <div>
                                                <h3 className="text-base font-medium mb-2">Business Hours Configuration</h3>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    Current business hours configuration for this queue.
                                                </p>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                                        <div>
                                                            <Label className="text-sm font-medium">Opening Time</Label>
                                                            <p className="text-sm text-muted-foreground">Automatic start time configuration</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <Input
                                                                type="time"
                                                                value={queueDraft?.start_time_asap || convertUTCToLocal(selectedQueueData?.start_time_asap) || ""}
                                                                onChange={(e) => {
                                                                    if (!queueDraft) return
                                                                    setQueueDraft({ ...queueDraft, start_time_asap: e.target.value || null })
                                                                }}
                                                                className="text-lg font-mono w-auto min-w-[140px]"
                                                                disabled={editDisabled}
                                                            />
                                                        </div>
                                                    </div>

                                                    {selectedQueueData?.stop_time_asap_enable && (
                                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                                            <div>
                                                                <Label className="text-sm font-medium">Closing Time</Label>
                                                                <p className="text-sm text-muted-foreground">Automatic stop time configuration</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <Input
                                                                    type="time"
                                                                    value={queueDraft?.stop_time_asap || convertUTCToLocal(selectedQueueData?.stop_time_asap) || ""}
                                                                    onChange={(e) => {
                                                                        if (!queueDraft) return
                                                                        setQueueDraft({ ...queueDraft, stop_time_asap: e.target.value || null })
                                                                    }}
                                                                    className="text-lg font-mono w-auto min-w-[140px]"
                                                                    disabled={editDisabled}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                                        {intl.formatMessage({ id: "businessHours.disclaimer" })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-base font-medium mb-2">Business Hours Configuration</h3>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Current business hours configuration for this queue.
                                            </p>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div>
                                                        <Label className="text-sm font-medium">Opening Time</Label>
                                                        <p className="text-sm text-muted-foreground">Automatic start time configuration</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Input
                                                            type="time"
                                                            value={queueDraft?.start_time_asap || convertUTCToLocal(selectedQueueData?.start_time_asap) || ""}
                                                            onChange={(e) => {
                                                                if (!queueDraft) return
                                                                setQueueDraft({ ...queueDraft, start_time_asap: e.target.value || null })
                                                            }}
                                                            className="text-lg font-mono w-auto min-w-[140px]"
                                                            disabled={editDisabled}
                                                        />
                                                    </div>
                                                </div>

                                                {selectedQueueData?.stop_time_asap_enable && (
                                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                                        <div>
                                                            <Label className="text-sm font-medium">Closing Time</Label>
                                                            <p className="text-sm text-muted-foreground">Automatic stop time configuration</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <Input
                                                                type="time"
                                                                value={queueDraft?.stop_time_asap || convertUTCToLocal(selectedQueueData?.stop_time_asap) || ""}
                                                                onChange={(e) => {
                                                                    if (!queueDraft) return
                                                                    setQueueDraft({ ...queueDraft, stop_time_asap: e.target.value || null })
                                                                }}
                                                                className="text-lg font-mono w-auto min-w-[140px]"
                                                                disabled={editDisabled}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                                    {intl.formatMessage({ id: "businessHours.disclaimer" })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <AlarmClock className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium">Select a Queue</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Select a queue from the list to configure its behavior outside business hours
                                </p>
                            </div>
                        )}
                    </CardContent>
                    {selectedQueueData && (
                        <CardFooter className="flex justify-between">
                            <Button variant="outline" onClick={() => setSelectedQueue(null)}>
                                Cancel
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button disabled={!hasChanges() || editDisabled} >
                                        <Save className="mr-2 h-4 w-4" />
                                        Save configuration
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm changes?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            You are about to save the Outside Business Hours Callback configuration for the queue {selectedQueueData?.queue_name}.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={saveConfiguration}>Confirm</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    )}
                </Card>

                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>Configuration Summary</CardTitle>
                        <CardDescription>
                            Overview of the Outside Business Hours Callback configuration for all queues
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Queue</TableHead>
                                    <TableHead>Business Hours</TableHead>
                                    <TableHead>Callbacks Outside Hours</TableHead>
                                    <TableHead>Next Day Only</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {queuesData.map((queue: any) => {
                                    const effective = getCurrentQueue(queue)
                                    return (
                                        <TableRow key={queue.queue_id} className={selectedQueue === queue.queue_id ? "bg-muted/50" : ""}>
                                            <TableCell className="font-medium">{queue.queue_name}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={formatBusinessHours(effective)}>
                                                {formatBusinessHours(effective)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={effective.business_hours_enable ? "default" : "destructive"}>
                                                    {effective.business_hours_enable ? "Allowed" : "Not allowed"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {isCallbackEnabled(effective) && effective.allowed_callback_type === "ALLOW_SCHEDULING"
                                                    ? effective.allow_only_next_day
                                                        ? "Yes"
                                                        : "No"
                                                    : "-"}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {showSuccess && (
                <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center shadow-lg">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>Configuration saved successfully</span>
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

            <AlertDialog open={showQueueChangeDialog} onOpenChange={setShowQueueChangeDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            Pending changes
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved changes. Switching queues will discard them. Do you want to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelQueueChange}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmQueueChange} className="bg-orange-500 hover:bg-orange-600">Switch queue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageLayout>
    )
}
