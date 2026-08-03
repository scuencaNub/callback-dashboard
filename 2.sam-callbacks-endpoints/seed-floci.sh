#!/bin/bash
# =============================================================================
# Seed script para Floci - Crea tablas DynamoDB, colas SQS, buckets S3 y SSM params
# Ejecutar después de levantar Floci con: docker compose up -d
#
# Uso:
#   export AWS_ENDPOINT_URL=http://localhost:4566
#   export AWS_DEFAULT_REGION=us-east-1
#   export AWS_ACCESS_KEY_ID=test
#   export AWS_SECRET_ACCESS_KEY=test
#   bash seed-floci.sh
#
# O en una sola línea:
#   AWS_ENDPOINT_URL=http://localhost:4566 AWS_DEFAULT_REGION=us-east-1 AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test bash seed-floci.sh
# =============================================================================

export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

EP="--endpoint-url $AWS_ENDPOINT_URL"

echo "⏳ Esperando que Floci esté listo..."
until curl -s "$AWS_ENDPOINT_URL/_floci/health" > /dev/null 2>&1; do
    sleep 1
done
echo "✅ Floci está listo"

# =============================================================================
# DynamoDB Tables
# =============================================================================
echo ""
echo "📦 Creando tablas DynamoDB..."

aws dynamodb create-table \
    --table-name CallsInSystem \
    --attribute-definitions AttributeName=contact_id_inbound,AttributeType=S AttributeName=status,AttributeType=S AttributeName=call_at,AttributeType=S \
    --key-schema AttributeName=contact_id_inbound,KeyType=HASH \
    --global-secondary-indexes '[{"IndexName":"status-call_at-index","KeySchema":[{"AttributeName":"status","KeyType":"HASH"},{"AttributeName":"call_at","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ CallsInSystem" || echo "  ⚠️  CallsInSystem (ya existe)"

aws dynamodb create-table \
    --table-name HolidayCalendar \
    --attribute-definitions AttributeName=date,AttributeType=S \
    --key-schema AttributeName=date,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ HolidayCalendar" || echo "  ⚠️  HolidayCalendar (ya existe)"

aws dynamodb create-table \
    --table-name QueueConfiguration \
    --attribute-definitions AttributeName=queue_name,AttributeType=S \
    --key-schema AttributeName=queue_name,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ QueueConfiguration" || echo "  ⚠️  QueueConfiguration (ya existe)"

aws dynamodb create-table \
    --table-name UserAcl \
    --attribute-definitions AttributeName=email,AttributeType=S \
    --key-schema AttributeName=email,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ UserAcl" || echo "  ⚠️  UserAcl (ya existe)"

aws dynamodb create-table \
    --table-name CallbackConcurrencyMetrics \
    --attribute-definitions AttributeName=queue_name,AttributeType=S AttributeName=timestamp,AttributeType=S \
    --key-schema AttributeName=queue_name,KeyType=HASH AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ CallbackConcurrencyMetrics" || echo "  ⚠️  CallbackConcurrencyMetrics (ya existe)"

aws dynamodb create-table \
    --table-name QueueRegisterStats \
    --attribute-definitions AttributeName=queue_name,AttributeType=S \
    --key-schema AttributeName=queue_name,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ QueueRegisterStats" || echo "  ⚠️  QueueRegisterStats (ya existe)"

aws dynamodb create-table \
    --table-name QueueGroupInfo \
    --attribute-definitions AttributeName=queue_name,AttributeType=S \
    --key-schema AttributeName=queue_name,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ QueueGroupInfo" || echo "  ⚠️  QueueGroupInfo (ya existe)"

aws dynamodb create-table \
    --table-name CallbackReports \
    --attribute-definitions AttributeName=reportId,AttributeType=S AttributeName=createdByNormalized,AttributeType=S AttributeName=createdAt,AttributeType=S \
    --key-schema AttributeName=reportId,KeyType=HASH \
    --global-secondary-indexes '[{"IndexName":"CreatedByCreatedAtIndex","KeySchema":[{"AttributeName":"createdByNormalized","KeyType":"HASH"},{"AttributeName":"createdAt","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ CallbackReports" || echo "  ⚠️  CallbackReports (ya existe)"

# =============================================================================
# SQS Queues
# =============================================================================
echo ""
echo "📨 Creando colas SQS..."

aws sqs create-queue \
    --queue-name callback-report-jobs \
    --attributes '{"VisibilityTimeout":"960"}' \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ callback-report-jobs" || echo "  ⚠️  callback-report-jobs (ya existe)"

# =============================================================================
# S3 Buckets
# =============================================================================
echo ""
echo "🪣 Creando buckets S3..."

aws s3 mb s3://local-callback-reports --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ local-callback-reports" || echo "  ⚠️  local-callback-reports (ya existe)"

aws s3 mb s3://local-athena-results --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ local-athena-results" || echo "  ⚠️  local-athena-results (ya existe)"

# =============================================================================
# SSM Parameters
# =============================================================================
echo ""
echo "🔑 Creando parámetros SSM..."

aws ssm put-parameter \
    --name "/bppr-amazon-connect-extensions/LOCAL/callback-configuration" \
    --type "String" \
    --value '{"maxRetries":3,"retryIntervalMinutes":5,"operatingHoursStart":"08:00","operatingHoursEnd":"20:00","maxConcurrentCallbacks":10,"enabled":true}' \
    --overwrite \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ callback-configuration" || echo "  ⚠️  callback-configuration (error)"

# =============================================================================
# Seed Data
# =============================================================================
echo ""
echo "👤 Insertando datos de prueba..."

aws dynamodb put-item \
    --table-name UserAcl \
    --item '{"email":{"S":"editor@test.com"},"role":{"S":"editor"},"active":{"BOOL":true},"name":{"S":"Editor Local"}}' \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ UserAcl: editor@test.com (role: editor)" || echo "  ⚠️  UserAcl seed editor (error)"

aws dynamodb put-item \
    --table-name UserAcl \
    --item '{"email":{"S":"viewer@test.com"},"role":{"S":"viewer"},"active":{"BOOL":true},"name":{"S":"Viewer Local"}}' \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ UserAcl: viewer@test.com (role: viewer)" || echo "  ⚠️  UserAcl seed viewer (error)"

# Seed: QueueConfiguration de ejemplo
aws dynamodb put-item \
    --table-name QueueConfiguration \
    --item '{"queue_name":{"S":"BasicQueue"},"max_callbacks":{"N":"5"},"retry_interval":{"N":"300"},"enabled":{"BOOL":true}}' \
    --endpoint-url $AWS_ENDPOINT_URL \
    2>/dev/null && echo "  ✅ QueueConfiguration: BasicQueue" || echo "  ⚠️  QueueConfiguration seed (error)"

# =============================================================================
echo ""
echo "🎉 Seed completado!"
echo ""
echo "Verificar tablas:"
echo "  aws dynamodb list-tables --endpoint-url $AWS_ENDPOINT_URL"
echo ""
echo "Próximo paso:"
echo "  sam build"
echo "  sam local start-api --env-vars env.local.json"
echo ""
