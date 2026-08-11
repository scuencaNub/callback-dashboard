interface AppConfig {
    queueUrl: string
    permissionsUrl: string
    updateQueueConfigurationUrl: string
    holidayUrl: string
    createHolidayCalendarUrl: string
    updateHolidayCalendarUrl: string
    callbackUrl: string
    thresholdUrl: string
    updateCallbackConfigurationUrl: string
    updateCallInSystemUrl: string
    bulkUpdateCallInSystemByKeysUrl: string
    queryCallbackHistoryUrl: string
    reportByDateUrl: string
    reportsUrl: string
    callbackConcurrencyMetricsUrl: string
    callbackHistoricalSummaryUrl: string
    queueGroupInfoUrl: string
    updateQueueGroupInfoUrl: string
    blockedAnisInfo: string
    callbackNotAcceptedDetailUrl: string
    environment: string
    debug: boolean
    features: {
        editQueueConfiguration: boolean
        editHolidays: boolean
        editThreshold: boolean
        editCallbacks: boolean
        editQueueGroupBehavior: boolean
    }
}

const getConfig = (): AppConfig => {
    return {
        queueUrl: import.meta.env.VITE_QUEUE_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/queue-configurations',
        permissionsUrl: import.meta.env.VITE_PERMISSIONS_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/me/permissions',
        updateQueueConfigurationUrl: import.meta.env.VITE_UPDATE_QUEUE_CONFIGURATION || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/queue-configurations',
        holidayUrl: import.meta.env.VITE_HOLIDAY_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/getHolidayCalendar',
        createHolidayCalendarUrl: import.meta.env.VITE_CREATE_HOLIDAY_CALENDAR_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/holiday-calendars',
        updateHolidayCalendarUrl: import.meta.env.VITE_UPDATE_HOLIDAY_CALENDAR_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/holiday-calendars',
        callbackUrl: import.meta.env.VITE_CALLBACK_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/getCallsInSystem',
        thresholdUrl: import.meta.env.VITE_THRESHOLD_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/callback-configuration',
        updateCallbackConfigurationUrl: import.meta.env.VITE_UPDATE_CALLBACK_CONFIGURATION || import.meta.env.VITE_THRESHOLD_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/callback-configuration',
        updateCallInSystemUrl: import.meta.env.VITE_UPDATE_CALL_IN_SYSTEM_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/calls-in-system',
        bulkUpdateCallInSystemByKeysUrl: import.meta.env.VITE_BULK_UPDATE_CALL_IN_SYSTEM_BY_KEYS_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/calls-in-system/bulk-update-by-keys',
        queryCallbackHistoryUrl: import.meta.env.VITE_QUERY_CALLBACK_HISTORY_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/callback-history/query',
        reportByDateUrl: import.meta.env.VITE_REPORT_BY_DATE_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/reports/callbacks/by-date',
        reportsUrl: import.meta.env.VITE_REPORTS_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/reports',
        callbackConcurrencyMetricsUrl: import.meta.env.VITE_CALLBACK_CONCURRENCY_METRICS_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/callback-concurrency-metrics',
        callbackHistoricalSummaryUrl: import.meta.env.VITE_CALLBACK_HISTORICAL_SUMMARY_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/callback-historical-summary',
        queueGroupInfoUrl: import.meta.env.VITE_QUEUE_GROUP_INFO_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/queue-group-info',
        updateQueueGroupInfoUrl: import.meta.env.VITE_UPDATE_QUEUE_GROUP_INFO_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/queue-group-info',
        blockedAnisInfo: import.meta.env.VITE_BLOCKED_ANIS_URL || 'https://6orzydazih.execute-api.us-east-1.amazonaws.com/Prod/blocked-phone-numbers-info',
        callbackNotAcceptedDetailUrl: import.meta.env.VITE_CALLBACK_NOT_ACCEPTED_DETAIL_URL || 'https://2p2edmv0b8.execute-api.us-east-1.amazonaws.com/Prod/callback-not-accepted-detail',
        environment: import.meta.env.VITE_ENVIRONMENT || 'development',
        debug: import.meta.env.VITE_DEBUG === 'true',
        features: {
            editQueueConfiguration: import.meta.env.VITE_DISABLE_EDIT_QUEUECONFIGURATION !== 'true',
            editHolidays: import.meta.env.VITE_DISABLE_EDIT_HOLIDAYS !== 'true',
            editThreshold: import.meta.env.VITE_DISABLE_EDIT_THRESHOLD !== 'true',
            editCallbacks: import.meta.env.VITE_DISABLE_EDIT_CALLBACKS !== 'true',
            editQueueGroupBehavior: import.meta.env.VITE_DISABLE_EDIT_QUEUE_GROUP_BEHAVIOR !== 'true',
        }
    }
}

export const config = getConfig()
export default config
