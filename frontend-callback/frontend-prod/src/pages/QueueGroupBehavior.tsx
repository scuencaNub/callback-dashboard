import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useState } from "react"
import { useIntl } from "react-intl"
import { useAuth } from "../components/auth/AuthProvider"
import { PageLayout } from "../components/pageLayout"
import { Badge } from "../components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { useQueueGroupInfo } from "../hooks/queries/useQueueGroupInfo"
import { useUpdateQueueGroupInfo } from "../hooks/queries/useUpdateQueueGroupInfo"

type AfterThresholdBehavior = "QUEUE" | "CALLBACK"

export default function QueueGroupBehavior() {
    const { formatMessage: t } = useIntl()
    const { canEdit } = useAuth()
    const editDisabled = !canEdit

    const [savingName, setSavingName] = useState<string | null>(null)
    const [successName, setSuccessName] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const { data: items = [], isLoading, isError } = useQueueGroupInfo()
    const updateMutation = useUpdateQueueGroupInfo()

    const handleChange = async (queueGroupName: string, value: AfterThresholdBehavior) => {
        setSavingName(queueGroupName)
        setErrorMessage(null)
        try {
            await updateMutation.mutateAsync({ queueGroupName, payload: { after_threshold_behavior: value } })
            setSuccessName(queueGroupName)
            setTimeout(() => setSuccessName(null), 2500)
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : t({ id: "queueGroupBehavior.saveError" }))
        } finally {
            setSavingName(null)
        }
    }

    return (
        <PageLayout title={t({ id: "queueGroupBehavior.title" })}>

            {errorMessage && (
                <div className="flex items-center gap-2 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errorMessage}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        {t({ id: "queueGroupBehavior.subtitle" })}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : isError ? (
                        <p className="text-sm text-red-500">{t({ id: "queueGroupBehavior.loadError" })}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="pb-2 pr-6 font-medium">{t({ id: "queueGroupBehavior.col.queueGroup" })}</th>
                                        <th className="pb-2 pr-6 font-medium">{t({ id: "queueGroupBehavior.col.currentBehavior" })}</th>
                                        {!editDisabled && (
                                            <th className="pb-2 font-medium">{t({ id: "queueGroupBehavior.col.changeTo" })}</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items
                                        .slice()
                                        .sort((a, b) => a.queue_group_name.localeCompare(b.queue_group_name))
                                        .map((item) => {
                                            const isSaving = savingName === item.queue_group_name
                                            const isSuccess = successName === item.queue_group_name
                                            return (
                                                <tr key={item.queue_group_name} className="border-b last:border-0">
                                                    <td className="py-3 pr-6 font-medium">{item.queue_group_name}</td>
                                                    <td className="py-3 pr-6">
                                                        <Badge
                                                            variant={item.after_threshold_behavior === "CALLBACK" ? "default" : "secondary"}
                                                        >
                                                            {item.after_threshold_behavior}
                                                        </Badge>
                                                        {isSuccess && (
                                                            <CheckCircle2 className="ml-2 inline h-4 w-4 text-green-500" />
                                                        )}
                                                    </td>
                                                    {!editDisabled && (
                                                        <td className="py-3">
                                                            {isSaving ? (
                                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                            ) : (
                                                                <Select
                                                                    value={item.after_threshold_behavior}
                                                                    onValueChange={(val) =>
                                                                        handleChange(item.queue_group_name, val as AfterThresholdBehavior)
                                                                    }
                                                                    disabled={editDisabled}
                                                                >
                                                                    <SelectTrigger className="w-36">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="QUEUE">QUEUE</SelectItem>
                                                                        <SelectItem value="CALLBACK">CALLBACK</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageLayout>
    )
}
