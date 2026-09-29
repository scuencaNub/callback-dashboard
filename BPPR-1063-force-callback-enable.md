# BPPR-1063 — Forzar callback on/off (technical recap for backend-callback UI work)

Fuente: [BPPR-1063](https://nubity.atlassian.net/browse/BPPR-1063) ("Callback - discutir
nueva funcionabilidad"). Este documento resume, para quien vaya a trabajar en la UI/backend
de callback (este repo), toda la implementación ya realizada en el servicio de Amazon
Connect (lambdas + Dynamo + flujo) para la nueva funcionalidad de "forzar callback".
**Nada de lo descrito aquí vive en este repo todavía** — es infraestructura de Connect
(lambdas, DynamoDB, Contact Flows), fuera del árbol de código de `backend-callback`. Se deja
documentado aquí porque el cliente pidió que esta funcionalidad quede reflejada/gestionable
también desde la UI de callback.

## 1. Qué pidió el cliente

> "Nuevo 'feature' por queue group que pueda ser activo/desactivado por queue group; cuando
> se active si el threshold de ofrecer el callback se cumple el sistema sólo debe ofrecer la
> opción de callback (ASAP y Schedule) y NO ofrecer la opción de ir al queue, esto luego de
> ofrecer un mensaje especifico al cliente."

El alcance de granularidad cambió durante el desarrollo (comentario 114160, 19-ago): el
cliente pidió poder activar el feature para **una sola queue de entrada individual**, no
para todo un "queue group" (VH queue), para poder medir resultados antes de extender el
feature a todo un grupo.

## 2. Arquitectura del sistema de callback (contexto necesario)

- Dos flujos de Amazon Connect: `callback inbound - in hours` y
  `callback inbound - out of hours` (existen en PRD y en CERT, con nombres idénticos).
- El sistema completo de callback usa **24 lambdas** en total (22 invocadas directamente
  desde los flujos/step function + 2 dentro de módulos de Connect —
  `GetSchedulePrompts` y `UpdateNumberPromptTranscribe`).
- El punto de decisión real que determina qué pasa cuando se cumple el threshold de espera
  es el nodo `Compare` sobre `$.Attributes.afterThresholdBehavior` (valores `CALLBACK` /
  `QUEUE` / `EWT`), ubicado inmediatamente después del nodo `check-threshold-twominutes`
  (`$.Attributes.oldest_contact_age_max >= 120`). Este nodo es el "queue group" a nivel de
  negocio para este feature.
- Dos tablas DynamoDB son relevantes:
  - `TableQueueConfiguration` — una fila por **VH queue** (queue group). 20 filas en CERT.
  - `TableQueueAssociation` — una fila por **queue de entrada individual**. 166 filas en
    CERT. Partition key: `queue_arn` (no `queue_id`).

## 3. Fase A — Flag por VH queue (`TableQueueConfiguration`)

Implementada primero, luego superada por la Fase B (ver sección 4) como mecanismo de
decisión, pero el código y los datos siguen desplegados.

### 3.1. Lambdas afectadas (3)

Las 3 lambdas que modelan `TableQueueConfiguration` en su clase Python
(`model/queue_configuration.py`):

| Lambda | Rol |
|---|---|
| `GetQueueConfiguration` | Dueña de la tabla |
| `GetEwtValue` | Consumidora — ya cargaba `QueueConfiguration` internamente (vía `callback_queue_arn`, resuelto por `GetQueueAssociation`) |
| `GetSchedulePrompts` | Consumidora — vive dentro de un módulo de Connect, no invocada directamente desde los flujos |

Confirmado por doble verificación (env var real en AWS + escaneo de código completo) que
ninguna otra lambda del sistema (incluida la Step Function `callback-executor`) tiene
relación con esta tabla.

### 3.2. Cambios de código

- **Modelo**: se agregó `forceCallbackEnable` (mapeado a `force_callback_enable`) al
  constructor, `toDict()` y `fromDict()` de `QueueConfiguration`, en las 3 lambdas.
- **Return** (exposición del campo al flujo de Connect):
  - `GetQueueConfiguration`: agregado a la lista `bool_keys` (convierte bool → string
    `"true"/"false"`, requerido por Connect).
  - `GetEwtValue`: agregado en los 3 puntos de `return` (holiday override deshabilitado,
    configuración deshabilitada, resultado final).
  - `GetSchedulePrompts`: solo modelo, sin cambio de `return` (su lógica de prompts de
    horarios no expone campos de `QueueConfiguration`).

### 3.3. Datos

- Se detectó y corrigió un `queue_id` erróneo preexistente en CERT (fila
  `VHCallbackTrust English` apuntaba al instance id de PRD).
- Se seteó `force_callback_enable = false` por defecto en las **20 filas** de
  `TableQueueConfiguration` (CERT), preservando el resto de los campos.

### 3.4. Deploy

Las 3 lambdas fueron re-empaquetadas y deployadas a CERT vía `update-function-code`
(backup previo generado automáticamente). Validación funcional con evento simulado en
`GetEwtValue` y `GetQueueConfiguration`; `GetSchedulePrompts` solo verificada por
`CodeSha256` (no se tocó su `return`).

## 4. Fase B — Flag por queue de entrada individual (`TableQueueAssociation`) — VIGENTE

Pedido del cliente (comentario 114160, 19-ago): granularidad fina, una sola queue de
entrada dentro de un grupo, para poder probar antes de extender a todo el grupo.

### 4.1. Lambda afectada (1)

Solo **`GetQueueAssociation`** modela `TableQueueAssociation` en su clase Python
(`queue_association/model/queue_association.py`). Verificación exhaustiva (grep de
`queue_association`/`QueueAssociation` + búsqueda de carpetas `model/` en las 24 lambdas):
ninguna otra lambda usa esta clase.

**Hallazgo relacionado, sin impacto**: la lambda `getAvgEwt` (`BPAC-PRD-getAvgEwt` /
`BPAC-CRT-getAvgEwt`) también lee `TableQueueAssociation`, pero con `boto3` de bajo nivel
(`get_item` crudo, sin pasar por el modelo), solo para extraer `callback_queue_name` (usado
para calcular ECBT promedio en otra tabla). No lee ni necesita `force_callback_enable`.

### 4.2. Timing (favorable)

`GetQueueAssociation` (nodo `queue_asociation` en in-hours, `queue_asociation-copy-1` en
out-of-hours) corre **antes** que `GetEwtValue` en el camino real hacia el threshold. El
flag está disponible incluso más temprano que en la Fase A, sin agregar invocaciones nuevas.

### 4.3. Cambios de código

- **Modelo** (`queue_association/model/queue_association.py`): se agregó
  `forceCallbackEnable` (default `False`) al constructor, `toDict()` y `fromDict()` de
  `QueueAssociation`.
- **Entry point** (`entry_point/contact_center/get_queue_association.py`): se agregó el
  mismo patrón `bool_keys` que usa `GetQueueConfiguration`, para convertir el booleano a
  string `"true"/"false"` en el `return`.
- **Service** (`get_queue_association_service.py`): sin cambios — es un wrapper delgado
  (`getByQueueArn` → `table.get_item(Key={'queue_arn': queueArn})` →
  `QueueAssociation.fromDict(item)`), hereda el campo nuevo automáticamente.

### 4.4. Datos

`force_callback_enable = false` seteado en las **166 filas** de `TableQueueAssociation`
(CERT). Dry-run validado antes de aplicar; relectura post-aplicación confirmó 166/166 con
el campo, 0 pendientes.

### 4.5. Deploy

`GetQueueAssociation` re-empaquetada y deployada a CERT vía `update-function-code`
(mismo mecanismo que Fase A). `LastUpdateStatus: Successful`.

### 4.6. Reconciliación de flujo (evita doble fuente de verdad)

Tanto `GetQueueConfiguration`/`GetEwtValue` (Fase A) como `GetQueueAssociation` (Fase B)
devuelven un campo con el **mismo nombre** (`force_callback_enable`). Para evitar que el
`Compare` en `afterThresholdBehavior` lea un contact attribute ambiguo (resuelto por dos
`UpdateContactAttributes` distintos), se hizo en el flujo de Connect (CERT):

- Se **quitó** el mapeo de `force_callback_enable` del `UpdateContactAttributes` que sigue
  a `GetEwtValue`.
- Se **agregó** ese mismo mapeo al `UpdateContactAttributes` que sigue a
  `GetQueueAssociation` (que ya corre antes en el camino).

**Efecto**: el contact attribute `force_callback_enable` tiene una única fuente de verdad —
la queue de entrada individual. La Fase B **reemplaza** a la Fase A como mecanismo de
decisión. El `Compare` existente en `afterThresholdBehavior` no se duplicó — sigue siendo
uno solo, ahora alimentado por la fuente correcta. El valor que `GetEwtValue` sigue
calculando y devolviendo queda sin uso downstream (no se quitó del código de la lambda por
no ser necesario quitarlo).

## 5. Estado de las pruebas en CERT (a la fecha de este documento)

- Se cambió manualmente el valor de `force_callback_enable` a `true` para **una** queue de
  entrada puntual en `TableQueueAssociation` (CERT).
- El cliente probó esa queue (con el flag en `true`) y luego otra queue distinta que
  **no** tenía el flag habilitado (permanece en `false`, el default aplicado a las 166
  filas).
- Resultado esperado y confirmado en ambos casos según lo reportado por el cliente.
- **Pendiente ahora**: el cliente quiere terminar de validar el funcionamiento en CERT
  **a través de la UI** (este repo, `backend-callback` / `frontend-callback`), no solo
  editando Dynamo directamente. Esto es lo que motiva este documento — dar contexto técnico
  completo para que la UI pueda exponer/gestionar el flag `force_callback_enable` a nivel
  de queue de entrada.

## 6. Prompt/mensaje al cliente antes de forzar el callback

- El cliente proveyó un audio **temporal** (`ING.wav`, comentario 114687, 24-ago,
  Leyra M. Colon Burgos) para poder hacer pruebas mientras se define el mensaje definitivo.
- **El contenido del prompt/mensaje definitivo sigue sin definir por el cliente.** No hay
  fecha ni compromiso todavía.

## 7. Pendiente / próximos pasos

1. Habilitar en la UI (`backend-callback` / `frontend-callback`) la posibilidad de ver y
   editar el flag `force_callback_enable` de `TableQueueAssociation`, por queue de entrada
   individual — este es el motivo de este documento.
2. Definición del prompt/mensaje definitivo por parte del cliente (hoy solo hay un audio
   temporal para pruebas).
3. Validación end-to-end en CERT vía UI.
4. Aprobación del cliente.
5. Réplica de ambas fases a **PRD** (lambdas, datos en Dynamo, cambio de flujo) — nada de
   esto fue tocado en PRD todavía. Las lambdas equivalentes en PRD ya están identificadas:
   - Fase A: `GetQueueConfiguration`, `GetEwtValue`, `GetSchedulePrompts`.
   - Fase B: `GetQueueAssociation`.

## 8. Referencias / nombres de recursos (CERT)

| Recurso | Nombre |
|---|---|
| Lambda `GetQueueConfiguration` | `BPAC-CRT-bppr-amazon-connect-GetQueueConfiguration-GONwToCGHLoV` |
| Lambda `GetEwtValue` | `BPAC-CRT-bppr-amazon-connect-extension-GetEwtValue-afD8xHzpe3gj` |
| Lambda `GetSchedulePrompts` | `BPAC-CRT-bppr-amazon-connect-ex-GetSchedulePrompts-PmwskDC5sXlo` |
| Lambda `GetQueueAssociation` | `BPAC-CRT-bppr-amazon-connect-e-GetQueueAssociation-w7LW5HfTdhzl` |
| Lambda `getAvgEwt` (relacionada, sin cambios) | `BPAC-CRT-getAvgEwt` |
| Tabla `TableQueueConfiguration` | `BPAC-CRT-bppr-amazon-connect-extensions-TableQueueConfiguration-1XWR70G4CGBKS` |
| Tabla `TableQueueAssociation` | `BPAC-CRT-bppr-amazon-connect-extensions-TableQueueAssociation-1LLRAP25SZV4V` |
| Instancia Connect CERT | `1a73fe90-89b4-4bbf-8726-33777b4b7519` |
| Perfil AWS CLI | `bpac-crt` |

Documento fuente completo (con detalle de comandos, scripts y evidencia de ejecución):
`BPPR-1063/CHANGELOG.md` en el workspace de soluciones por ticket.
