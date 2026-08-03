import { Container, Header } from "@cloudscape-design/components"
import { CheckCircle, Clock, Loader2, RefreshCw, Search, XCircle } from "lucide-react"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useIntl } from 'react-intl'
import { PageLayout } from "../components/pageLayout"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table"
import { useCallbacks } from "../hooks/queries/useCallbacks"
import { useQueues } from "../hooks/queries/useQueues"
import { formatTimestampKey, getTimestampOrder } from "../lib/callbackTimestamp"
import { formatDateTime } from "../lib/formatDateTime"
import { getStatusColor } from "../lib/getStatusColor"
import { getStatusIcon } from "../lib/getStatusIcon"

const getPendingCallbacks = (callbacks: any[], selectedQueue: string) => {
    return callbacks.filter((callback) =>
        callback.status === "PENDING" &&
        (selectedQueue === "todas" || callback.queue_name === selectedQueue)
    ).length
}

const getCompletedCallbacks = (callbacks: any[], selectedQueue: string) => {
    return callbacks.filter((callback) =>
        callback.status === "COMPLETED" &&
        (selectedQueue === "todas" || callback.queue_name === selectedQueue)
    ).length
}

const getFailedCallbacks = (callbacks: any[], selectedQueue: string) => {
    return callbacks.filter((callback) =>
        callback.status === "FAILED" &&
        (selectedQueue === "todas" || callback.queue_name === selectedQueue)
    ).length
}

const getCancelledCallbacks = (callbacks: any[], selectedQueue: string) => {
    return callbacks.filter((callback) =>
        callback.status === "CANCELLED" &&
        (selectedQueue === "todas" || callback.queue_name === selectedQueue)
    ).length
}

const getRescheduledCallbacks = (callbacks: any[], selectedQueue: string) => {
    return callbacks.filter((callback) =>
        callback.status === "RESCHEDULED" &&
        (selectedQueue === "todas" || callback.queue_name === selectedQueue)
    ).length
}

const Loading = () => {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-4 w-4 animate-spin" />
        </div>
    )
}

const PAGINATION_SIZE = Number(import.meta.env.VITE_CALLBACK_PAGINATION_SIZE) ?? 1000;

const isValidDateValue = (value: unknown): value is string => {
    if (typeof value !== "string" || value.trim() === "") return false
    return !Number.isNaN(Date.parse(value))
}

export default function Dashboard() {
    const intl = useIntl()
    const [isLoading, setIsLoading] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedQueue, setSelectedQueue] = useState<string>("todas")
    const [selectedEstado, setSelectedEstado] = useState<string>("todos")
    const [selectedCallbackType, setSelectedCallbackType] = useState<string>("todos")
    const [selectedCallback, setSelectedCallback] = useState<any | null>(null)
    const [isPending, startTransition] = useTransition()
    const { data: callbacks = [], isLoading: isLoadingCallbacks, refetch } = useCallbacks(PAGINATION_SIZE)
    const { data: queues = [], isLoading: isLoadingQueues } = useQueues()

    useEffect(() => {
        setLastUpdate(new Date())
    }, [])

    const [isFiltering, setIsFiltering] = useState(false)

    useEffect(() => {
        if (callbacks.length > 1000) {
            setIsFiltering(true)

            // Usar requestIdleCallback para el próximo frame
            requestAnimationFrame(() => {
                setIsFiltering(false)
            })
        }
    }, [callbacks, searchQuery, selectedQueue, selectedEstado, selectedCallbackType])

    const filteredCallbacks = useMemo(() => {
        return callbacks.filter((callback) => {
            const matchesSearch =
                callback.contact_id_inbound.toLowerCase().includes(searchQuery.toLowerCase()) ||
                callback.customer_phone_number.includes(searchQuery) ||
                callback.queue_name.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesQueue = selectedQueue === "todas" || callback.queue_name === selectedQueue
            const matchesEstado = selectedEstado === "todos" || callback.status === selectedEstado
            const matchesCallbackType = selectedCallbackType === "todos" || callback.callback_type === selectedCallbackType

            return matchesSearch && matchesQueue && matchesEstado && matchesCallbackType
        })
    }, [callbacks, searchQuery, selectedQueue, selectedEstado, selectedCallbackType])

    const handleQueueChange = (value: string) => {
        startTransition(() => {
            setSelectedQueue(value)
        })
    }

    const handleEstadoChange = (value: string) => {
        startTransition(() => {
            setSelectedEstado(value)
        })
    }

    const handleCallbackTypeChange = (value: string) => {
        startTransition(() => {
            setSelectedCallbackType(value)
        })
    }

    const openTimestampView = (callback: any) => {
        setSelectedCallback(callback)
    }

    const closeTimestampView = () => {
        setSelectedCallback(null)
    }

    const refreshData = () => {
        setIsLoading(true)

        refetch().finally(() => {
            setLastUpdate(new Date())
            setIsLoading(false)
        })
    }
    return (
        <PageLayout
            title={intl.formatMessage({ id: 'dashboard.title' })} >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="rounded-md">
                    <Container
                        header={
                            <Header variant="h3">
                                <span className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                    <span className="whitespace-nowrap text-black">{intl.formatMessage({ id: 'dashboard.pendingCallbacks' })}</span>
                                </span>
                            </Header>
                        }
                        disableContentPaddings
                    >
                        <div className="p-5 pt-0">
                            <div className="text-3xl font-bold">{isLoadingCallbacks ? <Loading /> : getPendingCallbacks(callbacks, selectedQueue)}</div>
                            <p className="whitespace-nowrap text-xs text-muted-foreground mt-1">{intl.formatMessage({ id: 'dashboard.pendingCallbacksDescription' })}</p>
                        </div>
                    </Container>
                </div>

                <div className="rounded-md">
                    <Container
                        className={isLoadingCallbacks ? "h-full" : ""}
                        header={
                            <Header variant="h3">
                                <span className="flex items-center gap-2 text-sm">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="whitespace-nowrap text-black">{intl.formatMessage({ id: 'dashboard.completedCallbacks' })}</span>
                                </span>
                            </Header>
                        }
                        disableContentPaddings
                    >
                        <div className="p-5 pt-0">
                            <div className="text-3xl font-bold">{isLoadingCallbacks ?
                                <Loading />
                                : getCompletedCallbacks(callbacks, selectedQueue)}</div>
                            <p className="whitespace-nowrap text-xs text-muted-foreground mt-1">{intl.formatMessage({ id: 'dashboard.completedCallbacksDescription' })}</p>
                        </div>
                    </Container>
                </div>
                <div className="rounded-md">
                    <Container
                        header={
                            <Header variant="h3">
                                <span className="flex items-center gap-2 text-sm">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="whitespace-nowrap text-black">{intl.formatMessage({ id: 'dashboard.failedCallbacks' })}</span>
                                </span>
                            </Header>
                        }
                        disableContentPaddings
                    >
                        <div className="p-5 pt-0">
                            <div className="text-3xl font-bold">{isLoadingCallbacks ? <Loading /> : getFailedCallbacks(callbacks, selectedQueue)}</div>
                            <p className="whitespace-nowrap text-xs text-muted-foreground mt-1">{intl.formatMessage({ id: 'dashboard.failedCallbacksDescription' })}</p>
                        </div>
                    </Container>
                </div>
                <div className="rounded-md">
                    <Container
                        header={
                            <Header variant="h3">
                                <span className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                    <span className="whitespace-nowrap text-black">{intl.formatMessage({ id: 'dashboard.cancelledCallbacks' })}</span>
                                </span>
                            </Header>
                        }
                        disableContentPaddings
                    >
                        <div className="p-5 pt-0">
                            <div className="text-3xl font-bold">{isLoadingCallbacks ? <Loading /> : getCancelledCallbacks(callbacks, selectedQueue)}</div>
                            <p className="whitespace-nowrap text-xs text-muted-foreground mt-1">{intl.formatMessage({ id: 'dashboard.cancelledCallbacksDescription' })}</p>
                        </div>
                    </Container>
                </div>
                <div className="rounded-md">
                    <Container
                        header={
                            <Header variant="h3">
                                <span className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-yellow-500" />
                                    <span className="whitespace-nowrap text-black">{intl.formatMessage({ id: 'dashboard.rescheduledCallbacks' })}</span>
                                </span>
                            </Header>
                        }
                        disableContentPaddings
                    >
                        <div className="p-5 pt-0">
                            <div className="text-3xl font-bold">{isLoadingCallbacks ? <Loading /> : getRescheduledCallbacks(callbacks, selectedQueue)}</div>
                            <p className="whitespace-nowrap text-xs text-muted-foreground mt-1">{intl.formatMessage({ id: 'dashboard.rescheduledCallbacksDescription' })}</p>
                        </div>
                    </Container>
                </div>

            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{intl.formatMessage({ id: 'dashboard.callbackDetails' })}</CardTitle>
                    <CardDescription>{intl.formatMessage({ id: 'dashboard.callbackDetailsDescription' })}</CardDescription>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4 mb-2">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={refreshData} disabled={isLoading} className="gap-2">
                                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                                {intl.formatMessage({ id: 'common.refresh' })}
                            </Button>
                            <div className="text-sm text-muted-foreground">
                                {intl.formatMessage({ id: 'common.lastUpdate' })}: {lastUpdate?.toLocaleTimeString() || '--:--:--'}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={intl.formatMessage({ id: 'callbacks.searchByIdOrPhone' })}
                                className="pl-8"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);

                                    startTransition(() => {
                                        setSearchQuery(e.target.value);
                                    });
                                }}
                            />
                        </div>
                        <div>
                            <Select value={selectedCallbackType} onValueChange={handleCallbackTypeChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by callback type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">All types</SelectItem>
                                    <SelectItem value="ASAP">ASAP</SelectItem>
                                    <SelectItem value="SCHEDULE">SCHEDULE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Select value={selectedQueue} onValueChange={handleQueueChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder={intl.formatMessage({ id: 'callbacks.filterByQueue' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">{intl.formatMessage({ id: 'callbacks.allQueues' })}</SelectItem>
                                    {isLoadingQueues ? (
                                        <SelectItem value='todas' disabled>{intl.formatMessage({ id: 'common.loading' })}</SelectItem>
                                    ) : (
                                        queues.sort((a, b) => a.name.localeCompare(b.name)).map((queue) => {
                                            return <SelectItem key={queue.name} value={queue.name}>{queue.name}</SelectItem>
                                        })
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Select value={selectedEstado} onValueChange={handleEstadoChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder={intl.formatMessage({ id: 'callbacks.filterByStatus' })} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">{intl.formatMessage({ id: 'callbacks.allStatuses' })}</SelectItem>
                                    <SelectItem value="PENDING">{intl.formatMessage({ id: 'status.pending' })}</SelectItem>
                                    <SelectItem value="IN_PROGRESS">{intl.formatMessage({ id: 'status.inProgress' })}</SelectItem>
                                    <SelectItem value="COMPLETED">{intl.formatMessage({ id: 'status.completed' })}</SelectItem>
                                    <SelectItem value="FAILED">{intl.formatMessage({ id: 'status.failed' })}</SelectItem>
                                    <SelectItem value="CANCELLED">{intl.formatMessage({ id: 'status.cancelled' })}</SelectItem>
                                    <SelectItem value="RESCHEDULED">{intl.formatMessage({ id: 'status.rescheduled' })}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                    </div>
                </CardHeader>
                <CardContent className="overflow-y-auto h-[500px]">
                    {isLoadingCallbacks || isFiltering || isPending ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{intl.formatMessage({ id: 'callbacks.id' })}</TableHead>
                                    <TableHead>{intl.formatMessage({ id: 'callbacks.phone' })}</TableHead>
                                    <TableHead>{intl.formatMessage({ id: 'callbacks.queue' })}</TableHead>
                                    <TableHead>{intl.formatMessage({ id: 'callbacks.callbackType' })}</TableHead>
                                    <TableHead>{intl.formatMessage({ id: 'callbacks.status' })}</TableHead>
                                    <TableHead>{intl.formatMessage({ id: 'callbacks.timeOfRegistration' })}</TableHead>
                                    <TableHead>{intl.formatMessage({ id: 'callbacks.retry' })}</TableHead>
                                    <TableHead>{intl.formatMessage({ id: 'callbacks.scheduledDate' })}</TableHead>
                                    <TableHead>{intl.formatMessage({ id: 'callbacks.nextTimeToCall' })}</TableHead>
                                    <TableHead>{intl.formatMessage({ id: 'callbacks.attempts' })}</TableHead>
                                    <TableHead>{intl.formatMessage({ id: 'callbacks.agent' })}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCallbacks.length > 0 ? (
                                    filteredCallbacks.map((callback) => {
                                        const isSchedule = callback.callback_type === "SCHEDULE";
                                        return (
                                            <TableRow key={callback.contact_id_inbound}>
                                                <TableCell className="font-medium">{callback.contact_id_inbound}</TableCell>
                                                <TableCell>{callback.customer_phone_number}</TableCell>
                                                <TableCell>{callback.queue_name}</TableCell>
                                                <TableCell>{callback.callback_type}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`flex items-center gap-1 ${getStatusColor(callback.status)}`}>
                                                        {getStatusIcon(callback.status)}
                                                        <span className="capitalize whitespace-nowrap">
                                                            {callback.status === "PENDING"
                                                                ? intl.formatMessage({ id: 'status.pending' })
                                                                : callback.status === "IN_PROGRESS"
                                                                    ? intl.formatMessage({ id: 'status.inProgress' })
                                                                    : callback.status === "COMPLETED"
                                                                        ? intl.formatMessage({ id: 'status.completed' })
                                                                        : callback.status === "FAILED"
                                                                            ? intl.formatMessage({ id: 'status.failed' })
                                                                            : callback.status === "CANCELLED"
                                                                                ? intl.formatMessage({ id: 'status.cancelled' })
                                                                                : callback.status === "RESCHEDULED"
                                                                                    ? intl.formatMessage({ id: 'status.rescheduled' })
                                                                                    : callback.status.replace("_", " ")}
                                                        </span>
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{callback.timestamp?.["CB_REGISTERED"] || callback.timestamp?.["CB REGISTERED"] ? formatDateTime(callback.timestamp["CB_REGISTERED"] || callback.timestamp["CB REGISTERED"]) : "-"}</TableCell>
                                                <TableCell>{callback.timestamp?.["CB retry 1"] || callback.timestamp?.["CB_retry 1"] ? formatDateTime(callback.timestamp["CB retry 1"] || callback.timestamp["CB_retry 1"]) : "-"}</TableCell>
                                                <TableCell>
                                                    {isSchedule ? formatDateTime(callback.call_at) : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {isSchedule ? "-" : formatDateTime(callback.call_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="link"
                                                        className="h-auto p-0 font-medium text-primary hover:underline"
                                                        onClick={() => openTimestampView(callback)}
                                                    >
                                                        {callback.retries}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>{callback.agent_name || "-"}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-4 text-muted-foreground">
                                            {intl.formatMessage({ id: 'callbacks.noCallbacksFound' })}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="text-sm text-muted-foreground">
                        {intl.formatMessage({ id: 'dashboard.showingResults' }, {
                            count: filteredCallbacks.length,
                            total: callbacks.length
                        })}
                    </div>
                </CardFooter>
            </Card>

            {/* Timestamp Details Dialog */}
            <AlertDialog open={!!selectedCallback} onOpenChange={(open) => !open && closeTimestampView()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Timestamp Details</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="max-h-80 overflow-y-auto mt-2">
                        {selectedCallback?.timestamp ? (
                            (() => {
                                const timestampEntries = Object.entries(selectedCallback.timestamp)
                                    .filter(([_, value]) => value != null && value !== "")
                                    .sort(([keyA], [keyB]) => {
                                        const orderA = getTimestampOrder(keyA)
                                        const orderB = getTimestampOrder(keyB)
                                        if (orderA !== orderB) return orderA - orderB
                                        const valueA = selectedCallback.timestamp[keyA]
                                        const valueB = selectedCallback.timestamp[keyB]
                                        const hasDateA = isValidDateValue(valueA)
                                        const hasDateB = isValidDateValue(valueB)

                                        if (hasDateA && hasDateB) {
                                            return new Date(valueA).getTime() - new Date(valueB).getTime()
                                        }

                                        if (hasDateA) return -1
                                        if (hasDateB) return 1

                                        return String(valueA).localeCompare(String(valueB))
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
                                                    <TableCell>{formatTimestampKey(key, (o) => intl.formatMessage(o))}</TableCell>
                                                    <TableCell>{isValidDateValue(value) ? formatDateTime(value) : String(value)}</TableCell>
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
                        <AlertDialogCancel onClick={closeTimestampView}>Close</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageLayout>
    )
}
