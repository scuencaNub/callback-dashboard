# Scripts

## 1. create_call_year_semester_index (crear el GSI)

Crea el índice `call_year_semester-call_at-index` en la tabla DynamoDB.

### Opción A: Python
```bash
python create_call_year_semester_index.py --profile bppr-crt-sso
python create_call_year_semester_index.py --table-name MI-TABLA --profile bppr-crt-sso
```

### Opción B: Shell (AWS CLI)
```bash
chmod +x create_call_year_semester_index.sh
./create_call_year_semester_index.sh bppr-crt-sso
TABLE_NAME=mi-tabla ./create_call_year_semester_index.sh bppr-crt-sso
```

Esperar a que el índice esté en estado ACTIVE antes de ejecutar el backfill.

---

## 2. backfill_call_year_semester (poblar el GSI)

Backfill para agregar el atributo `call_year_semester` a los items existentes. Necesario para que el GSI tenga datos.

### Requisitos

- Python 3.x
- boto3 (`pip install boto3`)

### Uso

```bash
# Dry run (solo escanea, no escribe)
python backfill_call_year_semester.py --dry-run --profile bppr-crt-sso

# Producción (actualiza la tabla)
python backfill_call_year_semester.py --profile bppr-crt-sso

# Con límite (ej: probar con 100 items)
python backfill_call_year_semester.py --dry-run --limit 100 --profile bppr-crt-sso

# Tabla distinta
TABLE_NAME=mi-tabla python backfill_call_year_semester.py --profile bppr-crt-sso
```

### Lógica

- `call_at` = "2024-03-15 14:20" → `call_year_semester` = "2024-H1" (enero-junio)
- `call_at` = "2024-08-20 10:00" → `call_year_semester` = "2024-H2" (julio-diciembre)

---

## Orden para producción

1. `create_call_year_semester_index` (Python o .sh)
2. Esperar a que el índice esté ACTIVE
3. `backfill_call_year_semester.py` (primero dry-run, luego sin dry-run)
