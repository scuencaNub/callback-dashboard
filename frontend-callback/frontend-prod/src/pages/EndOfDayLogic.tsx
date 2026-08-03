import { AlarmClock, AlertCircle, Calendar, Check, Info, Save, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { PageLayout } from "../components/pageLayout"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Switch } from "../components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { useQueueConfiguration } from "../hooks/queries/useQueueConfiguration"

interface QueueDraft {
    ewt_max_minutes_enable: boolean
    allow_only_next_day: boolean
    stop_time_asap: string
    ewt_max_minutes: string
}

import { useAuth } from "../components/auth/AuthProvider"

export default function EndOfDayLogic() {
    const { canEdit } = useAuth()
    const editDisabled = !canEdit

    const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)
    const [showError, setShowError] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [showConfirmSave, setShowConfirmSave] = useState(false)
    const [_isLoading, setIsLoading] = useState(false)
    const [queueDraft, setQueueDraft] = useState<QueueDraft | null>(null)
    const [pendingQueueId, setPendingQueueId] = useState<string | null>(null)
    const [bypassHasChanges, setBypassHasChanges] = useState(false)

    const { queueConfigurations: queuesData = [] } = useQueueConfiguration()

    const selectedQueueData = useMemo(() => (
        selectedQueue !== null ? queuesData.find((q: any) => q.queue_id === selectedQueue) : null
    ), [selectedQueue, queuesData])

    useEffect(() => {
        if (selectedQueueData && !queueDraft) {
            setQueueDraft({
                ewt_max_minutes_enable: selectedQueueData.ewt_max_minutes_enable,
                allow_only_next_day: selectedQueueData.allow_only_next_day,
                stop_time_asap: selectedQueueData.stop_time_asap,
                ewt_max_minutes: selectedQueueData.ewt_max_minutes,
            })
        }
    }, [selectedQueueData, queueDraft])

    const isClosingTimeEnabled = (queue: QueueDraft) => queue.allow_only_next_day

    const getNextDayStartTime = (queue: { stop_time_asap: string }) => {
        if (!queue.stop_time_asap) return "16:00"
        const [hours, minutes] = queue.stop_time_asap.split(":").map(Number)
        const totalMinutes = hours * 60 + minutes - 30
        if (totalMinutes < 0) return "16:00"
        const newHours = Math.floor(totalMinutes / 60)
        const newMinutes = totalMinutes % 60
        return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
    }

    const updateDraft = (field: keyof QueueDraft, value: any) => {
        if (!queueDraft) return
        setQueueDraft((prev) => ({
            ...prev!,
            [field]: value,
        }))
    }

    const getCurrentQueue = (queue: any): any => {
        if (selectedQueue === queue.queue_id && queueDraft) {
            return { ...queue, ...queueDraft }
        }
        return queue
    }

    const hasChanges = () => {
        if (!selectedQueueData || !queueDraft) return false
        return (
            queueDraft.ewt_max_minutes_enable !== selectedQueueData.ewt_max_minutes_enable ||
            queueDraft.allow_only_next_day !== selectedQueueData.allow_only_next_day ||
            queueDraft.stop_time_asap !== selectedQueueData.stop_time_asap ||
            String(queueDraft.ewt_max_minutes) !== String(selectedQueueData.ewt_max_minutes)
        )
    }

    const validateConfiguration = () => {
        if (!selectedQueueData) {
            setErrorMessage("Please select a queue to validate the configuration.")
            setShowError(true)
            return false
        }
        let isValid = true
        let message = ""
        if (queueDraft?.ewt_max_minutes_enable) {
            const ewtLimit = parseInt(String(queueDraft.ewt_max_minutes))
            if (ewtLimit <= 0) {
                isValid = false
                message = `El EWT límite para ${selectedQueueData.queue_name} debe ser mayor a 0 minutos`
            }
        }
        if (queueDraft?.allow_only_next_day && isClosingTimeEnabled(queueDraft)) {
            const currentQueue = getCurrentQueue(selectedQueueData)
            const closeTime = convertTimeToMinutes(currentQueue.stop_time_asap)
            const nextDayStartTime = convertTimeToMinutes(getNextDayStartTime(currentQueue))
            if (nextDayStartTime >= closeTime) {
                isValid = false
                message = `El tiempo de inicio para Next Day Only en ${selectedQueueData.queue_name} debe ser anterior al horario de cierre`
            }
        }
        if (!isValid) {
            setErrorMessage(message)
            setShowError(true)
        }
        return isValid
    }

    const convertTimeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number)
        return hours * 60 + minutes
    }

    const saveConfiguration = () => {
        if (!validateConfiguration()) return
        setIsLoading(true)
        setTimeout(() => {
            setBypassHasChanges(true)
            setQueueDraft(null)
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 3000)
            setIsLoading(false)
            setShowConfirmSave(false)
        }, 800)
    }

    const handleQueueSelection = (queueId: string) => {
        if (selectedQueue && hasChanges() && !bypassHasChanges) {
            setPendingQueueId(queueId)
            return
        }
        setBypassHasChanges(false)
        setSelectedQueue(queueId)
        setQueueDraft(null)
    }

    return (
        <PageLayout
            title="End of Day Logic"
            description="Configure automatic rules to determine when to stop offering Callbacks at the end of the day"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Queues</CardTitle>
                        <CardDescription>Select a queue to configure its closing logic</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {queuesData.map((queue: any) => {
                                const currentQueue = getCurrentQueue(queue)
                                const effectiveEwtEnabled = currentQueue.ewt_max_minutes_enable
                                return (
                                    <div
                                        key={queue.queue_id}
                                        className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${selectedQueue === queue.queue_id ? "border-primary bg-muted/50" : ""}`}
                                        onClick={() => handleQueueSelection(queue.queue_id)}
                                    >
                                        <h3 className="font-medium mb-2">{queue.queue_name}</h3>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground">Closing: {queue.stop_time_asap}</p>
                                            <Badge variant={effectiveEwtEnabled ? "default" : "outline"}>
                                                <span className="whitespace-nowrap">{effectiveEwtEnabled ? "Configured" : "Not configured"}</span>
                                            </Badge>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>End of Day Logic Configuration</CardTitle>
                        <CardDescription>Define how and when to stop offering Callbacks at the end of the day</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {selectedQueueData ? (
                            <Tabs defaultValue="ewt">
                                <TabsList className="mb-4">
                                    <TabsTrigger value="ewt">Based on EWT</TabsTrigger>
                                    <TabsTrigger value="nextday">Next Day Schedule</TabsTrigger>
                                </TabsList>
                                <TabsContent value="ewt" className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-base font-medium">Activate EWT-based logic</Label>
                                                <p className="text-sm text-muted-foreground mt-1">Deactivate Callback when EWT exceeds the configured limit</p>
                                            </div>
                                            <Switch checked={queueDraft?.ewt_max_minutes_enable || false} onCheckedChange={(checked) => updateDraft("ewt_max_minutes_enable", checked)} disabled={editDisabled} />
                                        </div>
                                        <div className={`space-y-4 p-4 border rounded-lg ${!queueDraft?.ewt_max_minutes_enable ? "opacity-50 pointer-events-none" : ""}`}>
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <Label htmlFor="ewt-limit" className="font-medium">EWT Limit (minutes)</Label>
                                                    <span className="text-sm text-muted-foreground">Current value: {queueDraft?.ewt_max_minutes || ""} min</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Input id="ewt-limit" type="number" value={queueDraft?.ewt_max_minutes || ""} onChange={(e) => updateDraft("ewt_max_minutes", e.target.value)} className="w-full" min={1} max={120} disabled={editDisabled} />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">If the estimated wait time (EWT) is greater than this value before closing, Callback will not be offered.</p>
                                            </div>
                                            <div className="bg-muted/50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium flex items-center gap-2 mb-2"><Info className="h-4 w-4 text-blue-500" /> System behavior</h3>
                                                <p className="text-sm text-muted-foreground">With the current configuration, the system will stop offering Callbacks for the queue <strong>{selectedQueueData?.queue_name}</strong> when the EWT is greater than <strong>{queueDraft?.ewt_max_minutes || ""} minutes</strong> before the closing time (<strong>{queueDraft?.stop_time_asap || ""}</strong>).</p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="nextday" className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="text-base font-medium">Activate Next Day Schedule</Label>
                                                <p className="text-sm text-muted-foreground mt-1">Only offer Callbacks for the next day starting at a certain time</p>
                                            </div>
                                            <Switch checked={queueDraft?.allow_only_next_day || false} onCheckedChange={(checked) => updateDraft("allow_only_next_day", checked)} disabled={editDisabled} />
                                        </div>
                                        <div className={`space-y-4 p-4 border rounded-lg ${!queueDraft?.allow_only_next_day ? "opacity-50 pointer-events-none" : ""}`}>
                                            <div>
                                                <div className="flex justify-between mb-2">
                                                    <Label htmlFor="next-day-start" className="font-medium">Start time for Next Day Only</Label>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Input id="next-day-start" type="time" value={getNextDayStartTime(getCurrentQueue(selectedQueueData))} readOnly className="w-full" />
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">From this time, the system will only offer Callbacks scheduled for the next day.</p>
                                            </div>
                                            <div className="bg-muted/50 p-4 rounded-lg">
                                                <h3 className="text-sm font-medium flex items-center gap-2 mb-2"><Calendar className="h-4 w-4 text-blue-500" /> System behavior</h3>
                                                <p className="text-sm text-muted-foreground">Starting at <strong>{getNextDayStartTime(getCurrentQueue(selectedQueueData))}</strong>, the system will only offer Callbacks scheduled for the next day in the queue <strong>{selectedQueueData.queue_name}</strong>.</p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <AlarmClock className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium">Select a Queue</h3>
                                <p className="text-sm text-muted-foreground mt-2">Select a queue from the list to configure its closing logic</p>
                            </div>
                        )}
                    </CardContent>
                    {selectedQueueData && (
                        <CardFooter className="flex justify-between">
                            <Button variant="outline" onClick={() => setSelectedQueue(null)}>Cancel</Button>
                            <AlertDialog open={showConfirmSave} onOpenChange={setShowConfirmSave}>
                                <AlertDialogTrigger asChild>
                                    <Button disabled={!hasChanges()} onClick={() => { if (validateConfiguration()) setShowConfirmSave(true) }}>
                                        <Save className="mr-2 h-4 w-4" /> Save configuration
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm changes?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            You are about to save the End of Day Logic configuration for the queue {selectedQueueData.queue_name}.
                                            This action will affect the system's behavior at the end of the day.
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
            </div>

            <div className="md:col-span-3 mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Configuration Summary</CardTitle>
                        <CardDescription>Overview of the End of Day Logic configured for each queue</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Queue</TableHead>
                                    <TableHead>Closing Time</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>EWT Limit</TableHead>
                                    <TableHead>Next Day Only</TableHead>
                                    <TableHead>Next Day Start Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {queuesData.map((queue: any) => {
                                    const currentQueue = getCurrentQueue(queue)
                                    return (
                                        <TableRow key={queue.queue_id}>
                                            <TableCell className="font-medium">{queue.queue_name}</TableCell>
                                            <TableCell>{currentQueue.stop_time_asap}</TableCell>
                                            <TableCell>
                                                <Badge variant={currentQueue.ewt_max_minutes_enable ? "default" : "outline"}>
                                                    {currentQueue.ewt_max_minutes_enable ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{currentQueue.ewt_max_minutes_enable ? `${currentQueue.ewt_max_minutes} min` : "-"}</TableCell>
                                            <TableCell>{currentQueue.allow_only_next_day ? <Badge variant="secondary">Enabled</Badge> : <span className="text-muted-foreground">No</span>}</TableCell>
                                            <TableCell>{currentQueue.allow_only_next_day ? getNextDayStartTime(currentQueue) : "-"}</TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Confirm queue change dialog */}
            <AlertDialog open={pendingQueueId !== null} onOpenChange={(open) => { if (!open) setPendingQueueId(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            Changes pending
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved changes. Switching queue will discard them.
                            <br /><br />
                            <strong>Do you want to continue?</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingQueueId(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            if (pendingQueueId) {
                                setSelectedQueue(pendingQueueId)
                                setQueueDraft(null)
                                setPendingQueueId(null)
                            }
                        }}>
                            Switch queue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {showSuccess && (
                <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center shadow-lg">
                    <Check className="h-5 w-5 mr-2" />
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
        </PageLayout>
    )
}
