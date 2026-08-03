#!/bin/bash
# =============================================================================
# Warm up all Lambdas - hace un request a cada endpoint para forzar cold start
# Ejecutar después de levantar sam local start-api
#
# Uso: bash warm-lambdas.sh
# =============================================================================

BASE_URL="http://127.0.0.1:3001"

echo "🔥 Calentando Lambdas (secuencial, ~30s cada una)..."
echo ""

curl -s -o /dev/null -w "  ✅ getHolidayCalendar        %{http_code} (%{time_total}s)\n" "$BASE_URL/getHolidayCalendar"
curl -s -o /dev/null -w "  ✅ queue-configurations       %{http_code} (%{time_total}s)\n" "$BASE_URL/queue-configurations"
curl -s -o /dev/null -w "  ✅ callback-configuration     %{http_code} (%{time_total}s)\n" "$BASE_URL/callback-configuration"
curl -s -o /dev/null -w "  ✅ queue-group-info           %{http_code} (%{time_total}s)\n" "$BASE_URL/queue-group-info"
curl -s -o /dev/null -w "  ✅ callback-concurrency       %{http_code} (%{time_total}s)\n" "$BASE_URL/callback-concurrency-metrics"
curl -s -o /dev/null -w "  ✅ me/permissions             %{http_code} (%{time_total}s)\n" "$BASE_URL/me/permissions"
curl -s -o /dev/null -w "  ✅ reports                    %{http_code} (%{time_total}s)\n" "$BASE_URL/reports"
curl -s -o /dev/null -w "  ✅ getCallsInSystem           %{http_code} (%{time_total}s)\n" -X POST -H "Content-Type: application/json" -d "{}" "$BASE_URL/getCallsInSystem"

echo ""
echo "🎉 Todas las Lambdas están warm. El frontend debería cargar rápido ahora."
