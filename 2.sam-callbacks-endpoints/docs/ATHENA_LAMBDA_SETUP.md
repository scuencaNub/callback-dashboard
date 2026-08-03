## Lambda + Athena + S3: Guía rápida de permisos y ejemplo

Este documento resume **qué permisos e infraestructura necesitás** para que una Lambda ejecute queries en Athena y escriba los resultados en un bucket S3, más un ejemplo de código listo para probar.

---

### 1. Requisitos de infraestructura

- **Región**
  - Lambda, Athena y el bucket S3 de resultados deben estar **en la misma región** (en nuestro caso, `us-east-1`).
  - Cómo verificar:
    - Lambda:
      ```bash
      aws lambda get-function \
        --function-name SqlQueryAthena \
        --query 'Configuration.FunctionArn' \
        --output text
      ```
      Debe verse `...:lambda:us-east-1:...:function:SqlQueryAthena`.
    - Bucket S3:
      ```bash
      aws s3api get-bucket-location \
        --bucket test-athena-sql-lambda \
        --query 'LocationConstraint' \
        --output text
      ```
      Resultado `None` significa `us-east-1`.
    - Athena (workgroup `primary`):
      ```bash
      aws athena get-work-group \
        --work-group primary \
        --region us-east-1
      ```

- **Bucket S3 de resultados**
  - Debe existir, por ejemplo: `test-athena-sql-lambda`.
  - ACL mínima típica:
    - Owner con `FULL_CONTROL`.
    - Sin grants adicionales (el acceso se maneja por IAM).

---

### 2. Permisos IAM mínimos para la Lambda

El rol de ejecución de la Lambda (por ejemplo `SqlQueryAthena-role-...`) necesita:

#### 2.1. CloudWatch Logs (básico)

Esto suele venir de `AWSLambdaBasicExecutionRole`:

```json
{
  "Effect": "Allow",
  "Action": "logs:CreateLogGroup",
  "Resource": "arn:aws:logs:us-east-1:<ACCOUNT_ID>:*"
},
{
  "Effect": "Allow",
  "Action": [
    "logs:CreateLogStream",
    "logs:PutLogEvents"
  ],
  "Resource": "arn:aws:logs:us-east-1:<ACCOUNT_ID>:log-group:/aws/lambda/SqlQueryAthena:*"
}
```

#### 2.2. Permisos Athena

```json
{
  "Effect": "Allow",
  "Action": [
    "athena:StartQueryExecution",
    "athena:GetQueryExecution",
    "athena:GetQueryResults"
  ],
  "Resource": "*"
}
```

> Podés afinar `Resource` a workgroups específicos si lo necesitás, pero `*` es suficiente para el caso estándar.

#### 2.3. Permisos Glue (catálogo de datos)

Necesarios para que Athena pueda resolver base y tablas (por ejemplo `banking_raw.pr_demo_raw`):

```json
{
  "Effect": "Allow",
  "Action": [
    "glue:GetDatabase",
    "glue:GetDatabases",
    "glue:GetTable",
    "glue:GetTables",
    "glue:GetPartition",
    "glue:GetPartitions",
    "glue:BatchGetPartition"
  ],
  "Resource": [
    "arn:aws:glue:us-east-1:<ACCOUNT_ID>:catalog",
    "arn:aws:glue:us-east-1:<ACCOUNT_ID>:database/banking_raw",
    "arn:aws:glue:us-east-1:<ACCOUNT_ID>:table/banking_raw/pr_demo_raw"
  ]
}
```

En modo más laxo para pruebas:

```json
{
  "Effect": "Allow",
  "Action": [
    "glue:GetDatabase",
    "glue:GetDatabases",
    "glue:GetTable",
    "glue:GetTables",
    "glue:GetPartition",
    "glue:GetPartitions",
    "glue:BatchGetPartition"
  ],
  "Resource": "*"
}
```

#### 2.4. Permisos S3 sobre el bucket de resultados

Es crítico incluir también `s3:GetBucketLocation`; sin eso vimos el error:

> `Unable to verify/create output bucket test-athena-sql-lambda`

Política recomendada:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetBucketLocation",
    "s3:ListBucket"
  ],
  "Resource": "arn:aws:s3:::test-athena-sql-lambda"
},
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:PutObject",
    "s3:AbortMultipartUpload"
  ],
  "Resource": "arn:aws:s3:::test-athena-sql-lambda/*"
}
```

---

### 3. Ejemplo de Lambda (Python) que ejecuta una query en Athena

Este ejemplo:

- Ejecuta una query simple sobre `banking_raw.pr_demo_raw`.
- Espera a que termine.
- Devuelve el estado y algunas filas.
- Loguea claramente el motivo del fallo si la query falla.

```python
import json
import time

import boto3

athena = boto3.client("athena")

DATABASE = "banking_raw"
OUTPUT_BUCKET = "test-athena-sql-lambda"  # mismo bucket configurado en permisos
OUTPUT_PREFIX = "athena-results/"         # opcional, prefijo dentro del bucket


def lambda_handler(event, context):
    query = """
        SELECT customer_id, full_name, colonia
        FROM pr_demo_raw
        WHERE colonia = 'Puerto Nuevo'
        LIMIT 10
    """

    response = athena.start_query_execution(
        QueryString=query,
        QueryExecutionContext={"Database": DATABASE},
        ResultConfiguration={
            "OutputLocation": f"s3://{OUTPUT_BUCKET}/{OUTPUT_PREFIX}"
        },
    )

    query_execution_id = response["QueryExecutionId"]
    print(f"Started Athena query. QueryExecutionId={query_execution_id}")

    # Esperar a que termine
    while True:
        exec_resp = athena.get_query_execution(QueryExecutionId=query_execution_id)
        status = exec_resp["QueryExecution"]["Status"]
        state = status["State"]

        if state in ("SUCCEEDED", "FAILED", "CANCELLED"):
            break

        time.sleep(1)

    reason = status.get("StateChangeReason", "")
    print(f"Query state={state}, reason={reason}")

    if state != "SUCCEEDED":
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "message": "Query failed",
                    "state": state,
                    "reason": reason,
                    "queryExecutionId": query_execution_id,
                }
            ),
        }

    # Obtener resultados (primeras filas)
    result_data = athena.get_query_results(QueryExecutionId=query_execution_id)
    rows = result_data["ResultSet"]["Rows"]

    # Convertir a algo más legible (omite la fila de encabezados)
    headers = [col["VarCharValue"] for col in rows[0]["Data"]]
    items = []
    for row in rows[1:]:
        values = [col.get("VarCharValue") for col in row["Data"]]
        items.append(dict(zip(headers, values)))

    return {
        "statusCode": 200,
        "body": json.dumps(
            {
                "queryExecutionId": query_execution_id,
                "items": items,
            }
        ),
    }
```

---

### 4. Errores típicos que vimos y cómo se resolvieron

- **`Unable to verify/create output bucket test-athena-sql-lambda` (InvalidRequestException en `StartQueryExecution`)**
  - Causa: faltaba `s3:GetBucketLocation` (y/o permisos S3 apropiados) sobre el bucket de resultados.
  - Fix: agregar `s3:GetBucketLocation`, `s3:ListBucket`, `s3:GetObject`, `s3:PutObject`, `s3:AbortMultipartUpload` sobre `arn:aws:s3:::test-athena-sql-lambda` y `arn:aws:s3:::test-athena-sql-lambda/*`.

- **`is not authorized to perform: glue:GetDatabase on resource: arn:aws:glue:...:catalog`**
  - Causa: el rol de la Lambda no tenía permisos de Glue para leer el catálogo de datos que usa Athena.
  - Fix: agregar acciones de lectura de Glue (`glue:GetDatabase`, `glue:GetTable`, etc.) sobre el catálogo y las bases/tablas relevantes (o `Resource: "*"` para pruebas).

- **`Query failed: FAILED` sin más contexto**
  - Causa: el código de la Lambda no exponía `StateChangeReason`.
  - Fix: leer `Status.StateChangeReason` desde `get_query_execution` para ver el motivo detallado (permisos, tabla inexistente, error de SQL, etc.).

Con esta checklist y el ejemplo de código, la próxima configuración de una Lambda que consulte Athena y escriba a un bucket S3 debería ser mucho más rápida y sin sorpresas. 


