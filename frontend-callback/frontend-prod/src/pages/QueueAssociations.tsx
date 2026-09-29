import { Loader2, RefreshCw, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { useIntl } from "react-intl"
import { useAuth } from "../components/auth/AuthProvider"
import { PageLayout } from "../components/pageLayout"
import { Button } from "../components/ui/button"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/card"
import { Input } from "../components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table"
import { Switch } from "../components/ui/switch"
import { useQueueAssociations } from "../hooks/queries/useQueueAssociations"
import { useUpdateQueueAssociation } from "../hooks/queries/useUpdateQueueAssociation"

export default function QueueAssociations() {
    const { formatMessage: t } = useIntl()
    const { canEdit } = useAuth()
    const editDisabled = !canEdit

    const [searchQuery, setSearchQuery] = useState<string>("")
    const [savingQueueArn, setSavingQueueArn] = useState<string | null>(null)
    const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null)

    const { data, isLoading, isError, error, refetch, isFetching } = useQueueAssociations()
    const updateMutation = useUpdateQueueAssociation()

    const showAlert = (type: "success" | "error", message: string) => {
        setAlert({ type, message })
        setTimeout(() => setAlert(null), 5000)
    }

    const items = data ?? []

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items
        const query = searchQuery.trim().toLowerCase()
        return items.filter((item) => item.queue_name?.toLowerCase().includes(query))
    }, [searchQuery, items])

    const handleToggle = (queueArn: string, nextValue: boolean) => {
        if (editDisabled) return
        setSavingQueueArn(queueArn)
        updateMutation.mutate(
            { queue_arn: queueArn, force_callback_enable: nextValue },
            {
                onSuccess: () => {
                    showAlert("success", t({ id: 'queueAssociations.updateSuccess' }))
                },
                onError: (err) => {
                    showAlert("error", err instanceof Error ? err.message : t({ id: 'queueAssociations.updateError' }))
                },
                onSettled: () => {
                    setSavingQueueArn(null)
                },
            }
        )
    }

    return (
        <PageLayout title={t({ id: 'queueAssociations.title' })}>
            <div className="space-y-6">
                {alert && (
                    <div
                        className={`rounded-md border px-4 py-3 text-sm ${alert.type === "success"
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-red-200 bg-red-50 text-red-800"
                            }`}
                    >
                        {alert.message}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{t({ id: 'queueAssociations.title' })}</CardTitle>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => refetch()}
                                    disabled={isFetching}
                                >
                                    <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                                    {t({ id: 'queueAssociations.refresh' })}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t({ id: 'queueAssociations.searchPlaceholder' })}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">
                                    {t({ id: 'queueAssociations.loading' })}
                                </span>
                            </div>
                        ) : isError ? (
                            <div className="text-sm text-destructive py-4 text-center">
                                {t({ id: 'queueAssociations.error' })}: {error?.message ?? "Unknown error"}
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-4 text-center">
                                {t({ id: 'queueAssociations.noData' })}
                            </div>
                        ) : (
                            <div className="rounded-md border md:h-[calc(100vh-320px)] md:overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t({ id: 'queueAssociations.queueName' })}</TableHead>
                                            <TableHead className="text-right">
                                                {t({ id: 'queueAssociations.forceCallbackEnabled' })}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.map((item) => (
                                            <TableRow key={item.queue_arn}>
                                                <TableCell>{item.queue_name}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {savingQueueArn === item.queue_arn && (
                                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                        )}
                                                        <Switch
                                                            checked={Boolean(item.force_callback_enable)}
                                                            disabled={editDisabled || savingQueueArn === item.queue_arn}
                                                            onCheckedChange={(checked) => handleToggle(item.queue_arn, checked)}
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageLayout>
    )
}
