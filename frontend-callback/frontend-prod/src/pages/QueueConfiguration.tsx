import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useIntl } from "react-intl"
import { useAuth } from "../components/auth/AuthProvider"
import { PageLayout } from "../components/pageLayout"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { useQueueConfiguration } from "../hooks/queries/useQueueConfiguration"
import { useUpdateQueueConfiguration } from "../hooks/queries/useUpdateQueueConfiguration"

interface QueueDraft {
    max_retry_attempts: number
    retry_attempt_interval: number
    stop_on_voicemail: boolean
}

export default function QueueConfiguration() {
    const { formatMessage: t } = useIntl()
    const { canEdit } = useAuth()
    const editDisabled = !canEdit
    const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
    const [savingQueueId, setSavingQueueId] = useState<string | null>(null)
    const [queueDraft, setQueueDraft] = useState<QueueDraft | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)
    const [showError, setShowError] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")

    const { data: queues = [], isLoading } = useQueueConfiguration()
    const updateMutation = useUpdateQueueConfiguration()

    const selectedQueueData = selectedQueue !== null
        ? queues.find((q) => q.queue_id === selectedQueue)
        : null

    useEffect(() => {
        if (selectedQueueData && !queueDraft) {
            setQueueDraft({
                max_retry_attempts: Number(selectedQueueData.max_retry_attempts) || 0,
                retry_attempt_interval: Number(selectedQueueData.retry_attempt_interval) || 900, // Default 15 minutes = 900 seconds
                stop_on_voicemail: Boolean(selectedQueueData.stop_on_voicemail) || false,
            })
        }
    }, [selectedQueueData, queueDraft])

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
            queueDraft.max_retry_attempts !== (selectedQueueData.max_retry_attempts || 0) ||
            queueDraft.retry_attempt_interval !== (selectedQueueData.retry_attempt_interval || 900) ||
            queueDraft.stop_on_voicemail !== (selectedQueueData.stop_on_voicemail || false)
        )
    }

    const validateConfiguration = () => {
        if (!selectedQueueData) {
            setErrorMessage(t({ id: 'queueConfig.selectQueue' }))
            setShowError(true)
            return false
        }

        let isValid = true
        let message = ""

        if (queueDraft?.retry_attempt_interval && queueDraft.retry_attempt_interval < 300) { // 5 minutes = 300 seconds
            isValid = false
            message = t({ id: 'queueConfig.invalidInterval' })
        }

        if (queueDraft?.retry_attempt_interval && queueDraft.retry_attempt_interval > 7200) { // 120 minutes = 7200 seconds
            isValid = false
            message = t({ id: 'queueConfig.invalidIntervalMax' })
        }

        if (!isValid) {
            setErrorMessage(message)
            setShowError(true)
        }

        return isValid
    }

    const saveConfiguration = async (queueId: string) => {
        if (!validateConfiguration() || !queueDraft) return

        setSavingQueueId(queueId)
        try {
            const payload = {
                max_retry_attempts: queueDraft.max_retry_attempts,
                retry_attempt_interval: queueDraft.retry_attempt_interval,
                stop_on_voicemail: queueDraft.stop_on_voicemail,
            }

            // Use queue_name instead of queue_id
            const queueName = selectedQueueData?.queue_name || queueId
            await updateMutation.mutateAsync({ queueName, payload })

            // Keep draft visible briefly to show the updated values, then clear
            setShowSuccess(true)
            setTimeout(() => {
                setQueueDraft(null)
                setSelectedQueue(null)
                setShowSuccess(false)
            }, 100) // Small delay to ensure optimistic update is visible
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Failed to save configuration")
            setShowError(true)
        } finally {
            setSavingQueueId(null)
        }
    }

    return (
        <PageLayout
            title={t({ id: 'queueConfig.title' })}
        >
            {/* Resumen de la configuración - Moved to top */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
                        {t({ id: 'queueConfig.configSummary' })}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Queues with custom configuration Column */}
                        <div>
                            <h3 className="text-lg font-medium mb-2 text-blue-600">{t({ id: 'queueConfig.customConfigTitle' })}</h3>
                            <ul className="space-y-2 text-sm">
                                {isLoading ? (
                                    <li className="flex items-center">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </li>
                                ) : (
                                    queues.map((queue) => {
                                        const currentQueue = getCurrentQueue(queue)
                                        return (
                                            <li key={queue.queue_id} className="flex items-center">
                                                <span className="font-bold">{queue.queue_name}:</span>
                                                <span className="ml-1">
                                                    {currentQueue.max_retry_attempts || 0} attempts, {Math.round((currentQueue.retry_attempt_interval || 900) / 60)} min. interval
                                                </span>
                                            </li>
                                        )
                                    })
                                )}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Configuration Editing Section */}
            <div className="space-y-6 md:h-[calc(100vh-200px)] md:overflow-y-auto">
                <div className="grid gap-6">
                    {
                        isLoading ? <div className="flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div> :
                            queues.map((queue) => {
                                const currentQueue = getCurrentQueue(queue)
                                return (
                                    <Card key={queue.queue_id}>
                                        <CardHeader className="flex flex-row items-start justify-between">
                                            <div>
                                                <CardTitle>{queue.queue_name}</CardTitle>
                                            </div>
                                            {hasChanges() && selectedQueue === queue.queue_id && !editDisabled && (
                                                <Button variant="outline" size="sm" onClick={() => {
                                                    setQueueDraft(null)
                                                    setSelectedQueue(null)
                                                }}>
                                                    {t({ id: 'queueConfig.cancelChanges' })}
                                                </Button>
                                            )}
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor={`max-retries-${queue.queue_id}`}>{t({ id: 'queueConfig.maxRetries' })}</Label>
                                                    <Select
                                                        value={currentQueue.max_retry_attempts?.toString() || "0"}
                                                        onValueChange={(value) => {
                                                            if (editDisabled) return
                                                            if (selectedQueue !== queue.queue_id) {
                                                                setSelectedQueue(queue.queue_id)
                                                                setQueueDraft({
                                                                    max_retry_attempts: Number(value),
                                                                    retry_attempt_interval: Number(queue.retry_attempt_interval) || 900, // Default 15 minutes = 900 seconds
                                                                    stop_on_voicemail: Boolean(queue.stop_on_voicemail) || false,
                                                                })
                                                            } else {
                                                                updateDraft("max_retry_attempts", Number.parseInt(value))
                                                            }
                                                        }}
                                                        disabled={editDisabled}
                                                    >
                                                        <SelectTrigger id={`max-retries-${queue.queue_id}`}>
                                                            <SelectValue placeholder="Seleccionar cantidad" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="0">0 additional attempt</SelectItem>
                                                            <SelectItem value="1">1 additional attempt</SelectItem>
                                                            <SelectItem value="2">2 additional attempts</SelectItem>
                                                            <SelectItem value="3">3 additional attempts</SelectItem>
                                                            <SelectItem value="4">4 additional attempts</SelectItem>
                                                            <SelectItem value="5">5 additional attempts</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Grid layout para inputs lado a lado */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Primer input: Interval between re-tries */}
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`retry-delay-${queue.queue_id}`}>{t({ id: 'queueConfig.retryInterval' })}</Label>
                                                        <div className="flex items-center space-x-2">
                                                            <Input
                                                                id={`retry-delay-${queue.queue_id}`}
                                                                type="number"
                                                                min="5"
                                                                max="120"
                                                                step="1"
                                                                value={Math.round((currentQueue.retry_attempt_interval || 900) / 60)}
                                                                onChange={(e) => {
                                                                    if (editDisabled) return
                                                                    if (selectedQueue !== queue.queue_id) {
                                                                        setSelectedQueue(queue.queue_id)
                                                                        setQueueDraft({
                                                                            max_retry_attempts: Number(queue.max_retry_attempts) || 0,
                                                                            retry_attempt_interval: Number.parseInt(e.target.value) * 60, // Convert minutes to seconds
                                                                            stop_on_voicemail: Boolean(queue.stop_on_voicemail) || false,
                                                                        })
                                                                    } else {
                                                                        updateDraft("retry_attempt_interval", Number.parseInt(e.target.value) * 60) // Convert minutes to seconds
                                                                    }
                                                                }}
                                                                disabled={editDisabled}
                                                                className="w-20"
                                                            />
                                                            <span className="text-sm text-muted-foreground">minutes</span>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </CardContent>
                                        <CardFooter>
                                            <Button
                                                className="mr-auto"
                                                onClick={() => saveConfiguration(queue.queue_id)}
                                                disabled={!hasChanges() || savingQueueId !== null || selectedQueue !== queue.queue_id || editDisabled}
                                            >
                                                {savingQueueId === queue.queue_id ? t({ id: 'queueConfig.saving' }) : t({ id: 'queueConfig.save' })}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                )
                            })
                    }
                </div>
            </div>

            {/* Notificaciones */}
            {
                showSuccess && (
                    <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center shadow-lg">
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        <span>{t({ id: 'queueConfig.configSaved' })}</span>
                    </div>
                )
            }

            {
                showError && (
                    <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center shadow-lg">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span>{errorMessage}</span>
                        <Button variant="ghost" size="icon" className="ml-2" onClick={() => setShowError(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )
            }
        </PageLayout >
    )
}
