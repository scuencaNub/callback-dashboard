import { AlertCircle, CheckCircle, Clock, RefreshCw, XCircle } from 'lucide-react'

export function getStatusIcon(status: string) {
    switch (status) {
        case "PENDING":
            return <Clock className="h-3 w-3" />
        case "IN_PROGRESS":
            return <AlertCircle className="h-3 w-3" />
        case "COMPLETED":
            return <CheckCircle className="h-3 w-3" />
        case "FAILED":
            return <XCircle className="h-3 w-3" />
        case "CANCELLED":
            return <XCircle className="h-3 w-3" />
        case "RESCHEDULED":
            return <RefreshCw className="h-3 w-3" />
        default:
            return <Clock className="h-3 w-3" />
    }
}
