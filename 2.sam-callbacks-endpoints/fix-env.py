import json

env = {
    "GetCallsInSystemFunction": {
        "DYNAMODB_TABLE_NAME": "CallsInSystem",
        "DYNAMODB_REGION": "us-east-1",
        "DYNAMODB_URI": "http://host.docker.internal:4566",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "UpdateCallsInSystemFunction": {
        "DYNAMODB_TABLE_NAME": "CallsInSystem",
        "DYNAMODB_REGION": "us-east-1",
        "DYNAMODB_URI": "http://host.docker.internal:4566",
        "ACL_TABLE_NAME": "UserAcl",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "GetHolidayCalendarFunction": {
        "AWS_DYNAMODB_TABLE_NAME": "HolidayCalendar",
        "AWS_DYNAMODB_REGION": "us-east-1",
        "AWS_DYNAMODB_URI": "http://host.docker.internal:4566",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "CreateHolidayCalendarFunction": {
        "AWS_DYNAMODB_TABLE_NAME": "HolidayCalendar",
        "AWS_DYNAMODB_REGION": "us-east-1",
        "AWS_DYNAMODB_URI": "http://host.docker.internal:4566",
        "ACL_TABLE_NAME": "UserAcl",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "UpdateHolidayCalendarFunction": {
        "AWS_DYNAMODB_TABLE_NAME": "HolidayCalendar",
        "AWS_DYNAMODB_REGION": "us-east-1",
        "AWS_DYNAMODB_URI": "http://host.docker.internal:4566",
        "ACL_TABLE_NAME": "UserAcl",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "DeleteHolidayCalendarFunction": {
        "AWS_DYNAMODB_TABLE_NAME": "HolidayCalendar",
        "AWS_DYNAMODB_REGION": "us-east-1",
        "AWS_DYNAMODB_URI": "http://host.docker.internal:4566",
        "ACL_TABLE_NAME": "UserAcl",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "GetQueueConfigurationFunction": {
        "AWS_DYNAMODB_TABLE_NAME": "QueueConfiguration",
        "AWS_DYNAMODB_REGION": "us-east-1",
        "AWS_DYNAMODB_URI": "http://host.docker.internal:4566",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "UpdateQueueConfigurationFunction": {
        "AWS_DYNAMODB_TABLE_NAME": "QueueConfiguration",
        "AWS_DYNAMODB_REGION": "us-east-1",
        "AWS_DYNAMODB_URI": "http://host.docker.internal:4566",
        "ACL_TABLE_NAME": "UserAcl",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "GetCallbackConfigurationFunction": {
        "PARAMETER_NAME": "/bppr-amazon-connect-extensions/LOCAL/callback-configuration",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test",
        "AWS_DEFAULT_REGION": "us-east-1",
        "AWS_ENDPOINT_URL": "http://host.docker.internal:4566"
    },
    "UpdateCallbackConfigurationFunction": {
        "PARAMETER_NAME": "/bppr-amazon-connect-extensions/LOCAL/callback-configuration",
        "DYNAMODB_REGION": "us-east-1",
        "DYNAMODB_URI": "http://host.docker.internal:4566",
        "ACL_TABLE_NAME": "UserAcl",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "BulkUpdateCallsInSystemByKeysFunction": {
        "DYNAMODB_TABLE_NAME": "CallsInSystem",
        "DYNAMODB_REGION": "us-east-1",
        "DYNAMODB_URI": "http://host.docker.internal:4566",
        "ACL_TABLE_NAME": "UserAcl",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "GetCallbackConcurrencyMetricsFunction": {
        "AWS_DYNAMODB_TABLE_NAME": "CallbackConcurrencyMetrics",
        "AWS_DYNAMODB_QUEUE_REGISTER_STATS_TABLE_NAME": "QueueRegisterStats",
        "AWS_DYNAMODB_REGION": "us-east-1",
        "AWS_DYNAMODB_URI": "http://host.docker.internal:4566",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "GetUserPermissionsFunction": {
        "ACL_TABLE_NAME": "UserAcl",
        "DYNAMODB_REGION": "us-east-1",
        "DYNAMODB_URI": "http://host.docker.internal:4566",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "QueryCallbackHistoryFunction": {
        "DYNAMODB_TABLE_NAME": "CallsInSystem",
        "AWS_REGION": "us-east-1",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "CreateReportByDateFunction": {
        "REPORTS_TABLE_NAME": "CallbackReports",
        "REPORTS_QUEUE_URL": "http://host.docker.internal:4566/000000000000/callback-report-jobs",
        "DYNAMODB_REGION": "us-east-1",
        "DYNAMODB_URI": "http://host.docker.internal:4566",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "ProcessReportByDateFunction": {
        "REPORTS_TABLE_NAME": "CallbackReports",
        "DYNAMODB_REGION": "us-east-1",
        "DYNAMODB_URI": "http://host.docker.internal:4566",
        "ATHENA_DATABASE": "local-callback-analytics",
        "ATHENA_OUTPUT_BUCKET": "local-athena-results",
        "ATHENA_OUTPUT_PREFIX": "athena-results/",
        "ATHENA_TABLE_NAME": "calls_in_system_history",
        "REPORTS_BUCKET": "local-callback-reports",
        "REPORTS_PREFIX": "reports/callbacks-by-date/",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "GetReportsFunction": {
        "REPORTS_TABLE_NAME": "CallbackReports",
        "DYNAMODB_REGION": "us-east-1",
        "DYNAMODB_URI": "http://host.docker.internal:4566",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "GetReportRowsFunction": {
        "REPORTS_TABLE_NAME": "CallbackReports",
        "DYNAMODB_REGION": "us-east-1",
        "DYNAMODB_URI": "http://host.docker.internal:4566",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "DownloadReportFunction": {
        "REPORTS_TABLE_NAME": "CallbackReports",
        "DYNAMODB_REGION": "us-east-1",
        "DYNAMODB_URI": "http://host.docker.internal:4566",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "QueryReportByDate": {
        "ATHENA_DATABASE": "local-callback-analytics",
        "ATHENA_OUTPUT_BUCKET": "local-athena-results",
        "ATHENA_OUTPUT_PREFIX": "athena-results/",
        "ATHENA_TABLE_NAME": "calls_in_system_history",
        "AWS_REGION": "us-east-1",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "GetQueueGroupInfoFunction": {
        "AWS_DYNAMODB_TABLE_NAME": "QueueGroupInfo",
        "AWS_DYNAMODB_REGION": "us-east-1",
        "AWS_DYNAMODB_URI": "http://host.docker.internal:4566",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    },
    "UpdateQueueGroupInfoFunction": {
        "AWS_DYNAMODB_TABLE_NAME": "QueueGroupInfo",
        "AWS_DYNAMODB_REGION": "us-east-1",
        "AWS_DYNAMODB_URI": "http://host.docker.internal:4566",
        "ACL_TABLE_NAME": "UserAcl",
        "CORS_ALLOWED_ORIGIN": "*",
        "AWS_ACCESS_KEY_ID": "test",
        "AWS_SECRET_ACCESS_KEY": "test"
    }
}

with open("env.local.json", "w") as f:
    json.dump(env, f, indent=4)
    f.write("\n")

print("env.local.json generado correctamente")
