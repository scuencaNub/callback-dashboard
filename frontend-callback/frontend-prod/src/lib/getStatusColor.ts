export function getStatusColor(status: string): string {
    switch (status) {
        case "PENDING":
            return "bg-yellow-100 text-yellow-800"
        case "IN_PROGRESS":
            return "bg-blue-100 text-blue-800"
        case "COMPLETED":
            return "bg-green-100 text-green-800"
        case "FAILED":
            return "bg-red-100 text-red-800"
        case "CANCELLED":
            return "bg-gray-100 text-gray-800"
        case "RESCHEDULED":
            return "bg-purple-100 text-purple-800"
        default:
            return "bg-gray-100 text-gray-800"
    }
}
