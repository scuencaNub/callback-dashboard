#!/bin/bash
# =============================================================================
# Seed: Feriados oficiales de Puerto Rico 2025-2026
# Inserta en la tabla HolidayCalendar de Floci (LocalStack)
#
# Uso:
#   bash seed-holidays-pr.sh
# =============================================================================

export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

echo "🇵🇷 Insertando feriados de Puerto Rico en HolidayCalendar..."
echo ""

# --- 2025 ---

echo "📅 2025:"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-01-01"},"name":{"S":"Año Nuevo"},"description":{"S":"New Year Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-01-01 Año Nuevo" || echo "  ⚠️  2025-01-01 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-01-06"},"name":{"S":"Día de Reyes"},"description":{"S":"Three Kings Day / Epiphany"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-01-06 Día de Reyes" || echo "  ⚠️  2025-01-06 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-01-13"},"name":{"S":"Natalicio de Eugenio María de Hostos"},"description":{"S":"Eugenio María de Hostos Birthday"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-01-13 Natalicio de Hostos" || echo "  ⚠️  2025-01-13 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-01-20"},"name":{"S":"Natalicio de Martin Luther King Jr."},"description":{"S":"Martin Luther King Jr. Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-01-20 MLK Day" || echo "  ⚠️  2025-01-20 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-02-17"},"name":{"S":"Día de los Presidentes"},"description":{"S":"Presidents Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-02-17 Día de los Presidentes" || echo "  ⚠️  2025-02-17 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-03-22"},"name":{"S":"Día de la Abolición de la Esclavitud"},"description":{"S":"Emancipation Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-03-22 Abolición de la Esclavitud" || echo "  ⚠️  2025-03-22 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-04-18"},"name":{"S":"Viernes Santo"},"description":{"S":"Good Friday"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-04-18 Viernes Santo" || echo "  ⚠️  2025-04-18 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-05-26"},"name":{"S":"Día de la Recordación"},"description":{"S":"Memorial Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-05-26 Memorial Day" || echo "  ⚠️  2025-05-26 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-06-19"},"name":{"S":"Juneteenth"},"description":{"S":"Juneteenth National Independence Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-06-19 Juneteenth" || echo "  ⚠️  2025-06-19 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-07-04"},"name":{"S":"Día de la Independencia de EE.UU."},"description":{"S":"US Independence Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-07-04 Independence Day" || echo "  ⚠️  2025-07-04 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-07-25"},"name":{"S":"Día de la Constitución de Puerto Rico"},"description":{"S":"Puerto Rico Constitution Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-07-25 Constitución de PR" || echo "  ⚠️  2025-07-25 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-07-27"},"name":{"S":"Natalicio de José Celso Barbosa"},"description":{"S":"José Celso Barbosa Birthday"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-07-27 Natalicio de Barbosa" || echo "  ⚠️  2025-07-27 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-09-01"},"name":{"S":"Día del Trabajo"},"description":{"S":"Labor Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-09-01 Labor Day" || echo "  ⚠️  2025-09-01 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-10-13"},"name":{"S":"Día de la Raza / Día de Colón"},"description":{"S":"Columbus Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-10-13 Día de la Raza" || echo "  ⚠️  2025-10-13 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-11-11"},"name":{"S":"Día del Veterano"},"description":{"S":"Veterans Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-11-11 Veterans Day" || echo "  ⚠️  2025-11-11 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-11-19"},"name":{"S":"Día del Descubrimiento de Puerto Rico"},"description":{"S":"Discovery of Puerto Rico Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-11-19 Descubrimiento de PR" || echo "  ⚠️  2025-11-19 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-11-27"},"name":{"S":"Día de Acción de Gracias"},"description":{"S":"Thanksgiving Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-11-27 Thanksgiving" || echo "  ⚠️  2025-11-27 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2025-12-25"},"name":{"S":"Navidad"},"description":{"S":"Christmas Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2025-12-25 Navidad" || echo "  ⚠️  2025-12-25 (error)"

echo ""
echo "📅 2026:"

# --- 2026 ---

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-01-01"},"name":{"S":"Año Nuevo"},"description":{"S":"New Year Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-01-01 Año Nuevo" || echo "  ⚠️  2026-01-01 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-01-06"},"name":{"S":"Día de Reyes"},"description":{"S":"Three Kings Day / Epiphany"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-01-06 Día de Reyes" || echo "  ⚠️  2026-01-06 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-01-12"},"name":{"S":"Natalicio de Eugenio María de Hostos"},"description":{"S":"Eugenio María de Hostos Birthday"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-01-12 Natalicio de Hostos" || echo "  ⚠️  2026-01-12 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-01-19"},"name":{"S":"Natalicio de Martin Luther King Jr."},"description":{"S":"Martin Luther King Jr. Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-01-19 MLK Day" || echo "  ⚠️  2026-01-19 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-02-16"},"name":{"S":"Día de los Presidentes"},"description":{"S":"Presidents Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-02-16 Día de los Presidentes" || echo "  ⚠️  2026-02-16 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-03-22"},"name":{"S":"Día de la Abolición de la Esclavitud"},"description":{"S":"Emancipation Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-03-22 Abolición de la Esclavitud" || echo "  ⚠️  2026-03-22 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-04-03"},"name":{"S":"Viernes Santo"},"description":{"S":"Good Friday"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-04-03 Viernes Santo" || echo "  ⚠️  2026-04-03 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-05-25"},"name":{"S":"Día de la Recordación"},"description":{"S":"Memorial Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-05-25 Memorial Day" || echo "  ⚠️  2026-05-25 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-06-19"},"name":{"S":"Juneteenth"},"description":{"S":"Juneteenth National Independence Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-06-19 Juneteenth" || echo "  ⚠️  2026-06-19 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-07-04"},"name":{"S":"Día de la Independencia de EE.UU."},"description":{"S":"US Independence Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-07-04 Independence Day" || echo "  ⚠️  2026-07-04 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-07-25"},"name":{"S":"Día de la Constitución de Puerto Rico"},"description":{"S":"Puerto Rico Constitution Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-07-25 Constitución de PR" || echo "  ⚠️  2026-07-25 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-07-27"},"name":{"S":"Natalicio de José Celso Barbosa"},"description":{"S":"José Celso Barbosa Birthday"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-07-27 Natalicio de Barbosa" || echo "  ⚠️  2026-07-27 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-09-07"},"name":{"S":"Día del Trabajo"},"description":{"S":"Labor Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-09-07 Labor Day" || echo "  ⚠️  2026-09-07 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-10-12"},"name":{"S":"Día de la Raza / Día de Colón"},"description":{"S":"Columbus Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-10-12 Día de la Raza" || echo "  ⚠️  2026-10-12 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-11-11"},"name":{"S":"Día del Veterano"},"description":{"S":"Veterans Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-11-11 Veterans Day" || echo "  ⚠️  2026-11-11 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-11-19"},"name":{"S":"Día del Descubrimiento de Puerto Rico"},"description":{"S":"Discovery of Puerto Rico Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-11-19 Descubrimiento de PR" || echo "  ⚠️  2026-11-19 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-11-26"},"name":{"S":"Día de Acción de Gracias"},"description":{"S":"Thanksgiving Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-11-26 Thanksgiving" || echo "  ⚠️  2026-11-26 (error)"

aws dynamodb put-item --table-name HolidayCalendar --endpoint-url $AWS_ENDPOINT_URL --item '{
  "date":{"S":"2026-12-25"},"name":{"S":"Navidad"},"description":{"S":"Christmas Day"},"configuration_type":{"S":"Completely disable callbacks"},"queue_overrides":{"M":{}}
}' 2>/dev/null && echo "  ✅ 2026-12-25 Navidad" || echo "  ⚠️  2026-12-25 (error)"

echo ""
echo "🎉 Seed de feriados completado! ($(aws dynamodb scan --table-name HolidayCalendar --select COUNT --endpoint-url $AWS_ENDPOINT_URL --query 'Count' --output text) registros)"
