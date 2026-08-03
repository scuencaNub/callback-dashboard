# Consulta por fecha (query_callback_history)

## Cómo funciona en el handler

Cuando **no** se envían `phone_numbers` (o viene vacío), el handler usa el GSI **`call_year_semester-call_at-index`**.

### 1. Formato de fechas

- Entrada: `start_date` y `end_date` en **YYYY-MM-DD** (ej. `2026-02-08`, `2026-02-09`).
- Para DynamoDB se arman:
  - `start_datetime` = `"{start_date} 00:00"` → `"2026-02-08 00:00"`
  - `end_datetime`   = `"{end_date} 23:59"`   → `"2026-02-09 23:59"`

### 2. Partición por semestre

El GSI tiene:

- **Partition key**: `call_year_semester` (string)
  - **H1**: enero–junio  → valor `"YYYY-H1"` (ej. `"2026-H1"`)
  - **H2**: julio–diciembre → valor `"YYYY-H2"` (ej. `"2026-H2"`)
- **Sort key**: `call_at` (string), formato `"YYYY-MM-DD HH:MM"` (ej. `"2026-02-08 09:43"`).

El handler arma uno o más “semestres” que se solapan con `[start_datetime, end_datetime]`:

- Para cada año en `[start_year, end_year]`:
  - H1: `YYYY-01-01 00:00` .. `YYYY-06-30 23:59`
  - H2: `YYYY-07-01 00:00` .. `YYYY-12-31 23:59`
- Solo se agrega un semestre si el rango pedido tiene intersección con ese semestre.

Ejemplos:

- `2026-02-08` a `2026-02-09` → solo **2026-H1** con `call_at` entre `"2026-02-08 00:00"` y `"2026-02-09 23:59"`.
- `2026-06-30` a `2026-07-02` → **2026-H1** (jun 30) y **2026-H2** (jul 1–2), dos queries.

### 3. Query DynamoDB (una por semestre)

Para cada `(partition_key, sort_start, sort_end)`:

- **Index**: `call_year_semester-call_at-index`
- **KeyConditionExpression**:  
  `call_year_semester = :pk AND call_at BETWEEN :sort_start AND :sort_end`
- **ExpressionAttributeValues**:
  - `:pk` = partition (ej. `"2026-H1"`)
  - `:sort_start` = inicio del rango (ej. `"2026-02-08 00:00"`)
  - `:sort_end` = fin del rango (ej. `"2026-02-09 23:59"`)

La paginación se hace con `ExclusiveStartKey` (cursor) cuando DynamoDB devuelve `LastEvaluatedKey`.

---

## Cómo hacer la misma consulta a mano

### Opción A: AWS CLI

Tabla y perfil (ajustar si usas otra):

```bash
TABLE="BPAC-CRT-bppr-amazon-connect-extensions-TableCallsInSystem-VBHP7ZSGIYO8"
PROFILE="bppr-crt-sso"
REGION="us-east-1"
```

**Un solo día (ej. 2026-02-09), semestre 2026-H1:**

```bash
aws dynamodb query \
  --table-name "$TABLE" \
  --index-name "call_year_semester-call_at-index" \
  --key-condition-expression "call_year_semester = :pk AND call_at BETWEEN :sort_start AND :sort_end" \
  --expression-attribute-values '{
    ":pk": {"S": "2026-H1"},
    ":sort_start": {"S": "2026-02-09 00:00"},
    ":sort_end": {"S": "2026-02-09 23:59"}
  }' \
  --profile "$PROFILE" \
  --region "$REGION"
```

**Varios días (ej. 2026-02-08 a 2026-02-09):**

```bash
aws dynamodb query \
  --table-name "$TABLE" \
  --index-name "call_year_semester-call_at-index" \
  --key-condition-expression "call_year_semester = :pk AND call_at BETWEEN :sort_start AND :sort_end" \
  --expression-attribute-values '{
    ":pk": {"S": "2026-H1"},
    ":sort_start": {"S": "2026-02-08 00:00"},
    ":sort_end": {"S": "2026-02-09 23:59"}
  }' \
  --profile "$PROFILE" \
  --region "$REGION"
```

**Solo contar (sin devolver ítems):**

```bash
aws dynamodb query \
  --table-name "$TABLE" \
  --index-name "call_year_semester-call_at-index" \
  --key-condition-expression "call_year_semester = :pk AND call_at BETWEEN :sort_start AND :sort_end" \
  --expression-attribute-values '{
    ":pk": {"S": "2026-H1"},
    ":sort_start": {"S": "2026-02-09 00:00"},
    ":sort_end": {"S": "2026-02-09 23:59"}
  }' \
  --select "COUNT" \
  --profile "$PROFILE" \
  --region "$REGION"
```

**Regla del semestre:**

- Si las fechas están entre **enero y junio** → `:pk` = `"YYYY-H1"`.
- Si están entre **julio y diciembre** → `:pk` = `"YYYY-H2"`.
- Si el rango cruza junio/julio, hay que hacer **dos** queries (una H1 y una H2) y unir resultados (como hace el handler).

---

### Opción B: Consola AWS (DynamoDB)

1. **AWS Console** → **DynamoDB** → **Tables** → elegir la tabla (ej. `BPAC-CRT-...-TableCallsInSystem-...`).
2. **Explore table items**.
3. En **Partition key** no uses la clave principal de la tabla; hay que elegir el **índice**:
   - Click en **Scan/Query** (o el selector de vista).
   - Cambiar a **Query**.
   - En **Index**, elegir **`call_year_semester-call_at-index`**.
4. Entonces aparecen:
   - **Partition key**: `call_year_semester` → valor, ej. `2026-H1`.
   - **Sort key**: `call_at` → para rango elegir **Between** y poner:
     - `2026-02-09 00:00`
     - `2026-02-09 23:59`
5. **Run**.

La consola no siempre permite “BETWEEN” en el sort key de forma visual; si no, se puede usar **Filter** sobre `call_at` (menos eficiente) o seguir usando CLI para rangos de fechas.

---

## Resumen

| Qué | Valor |
|-----|--------|
| Índice | `call_year_semester-call_at-index` |
| Partition key | `call_year_semester` → `"YYYY-H1"` o `"YYYY-H2"` |
| Sort key | `call_at` → `"YYYY-MM-DD HH:MM"` |
| Rango un día | `"2026-02-09 00:00"` .. `"2026-02-09 23:59"` |
| Rango varios días (mismo semestre) | `"2026-02-08 00:00"` .. `"2026-02-09 23:59"` |

Para hacer “a mano” lo mismo que el handler en un rango que cruza dos semestres: ejecutar una query por cada semestre que toque el rango y combinar resultados (y si quieres paginación, usar `LastEvaluatedKey` como `ExclusiveStartKey` en la siguiente llamada).
