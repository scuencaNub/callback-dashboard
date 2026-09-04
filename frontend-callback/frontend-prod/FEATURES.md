# Features del dashboard de callbacks

documentacion funcional, pagina por pagina, de lo que hace cada panel del frontend. generado a partir de una revision directa del codigo (rutas en `App.tsx`, menu en `appSidebar.tsx`, hooks en `src/hooks/queries/`, config en `src/config/env.ts`).

para pasos de deploy ver `README.md`. para el historial de cambios por release ver `2.sam-callbacks-endpoints/CHANGELOG.md`.

---

## configuracion global

### endpoints (src/config/env.ts)

todas las URLs son configurables via variables `VITE_*` (ver `.env.beta.local` / `.env.prd.local`). el default hardcodeado en el codigo apunta al API Gateway `6orzydazih...`, salvo `callbackNotAcceptedDetailUrl` que usa otro API Gateway (`2p2edmv0b8` en beta / `4q120yll5c` en prod).

| endpoint | path | usado por |
|---|---|---|
| `queueUrl` | GET `/queue-configurations` | listado de colas, usado en casi todas las paginas |
| `updateQueueConfigurationUrl` | PUT `/queue-configurations/{queue_name}` | Business Hours, Queue Configuration (retries) |
| `holidayUrl` | GET `/getHolidayCalendar` | Holidays |
| `createHolidayCalendarUrl` | POST `/holiday-calendars` | Holidays |
| `updateHolidayCalendarUrl` | PUT/DELETE `/holiday-calendars/{date}` | Holidays |
| `callbackUrl` | POST `/getCallsInSystem` | Dashboard |
| `thresholdUrl` | GET `/callback-configuration` | General Configuration |
| `updateCallbackConfigurationUrl` | PUT `/callback-configuration` | General Configuration |
| `updateCallInSystemUrl` | PUT `/calls-in-system/{contact_id_inbound}` | Queue Schedules (calls in system) |
| `bulkUpdateCallInSystemByKeysUrl` | POST `/calls-in-system/bulk-update-by-keys` | Queue Schedules (edicion masiva) |
| `queryCallbackHistoryUrl` | POST `/callback-history/query` | Connect Contacts Search |
| `reportByDateUrl` | POST `/reports/callbacks/by-date` | Connect Contacts Report by Date |
| `reportsUrl` | GET `/reports`, `/{id}/rows`, `/{id}/download` | Connect Contacts Report by Date |
| `callbackConcurrencyMetricsUrl` | GET `/callback-concurrency-metrics` | Concurrency Metrics |
| `callbackHistoricalSummaryUrl` | GET `/callback-historical-summary` | Historical Summary |
| `queueGroupInfoUrl` / `updateQueueGroupInfoUrl` | GET / PUT `/queue-group-info` | Queue Group Behavior |
| `blockedAnisInfo` | GET/POST/PUT/DELETE `/blocked-phone-numbers-info` | Blocked ANIs |
| `callbackNotAcceptedDetailUrl` | GET `/callback-not-accepted-detail` | Not Accepted Detail |

### permisos de edicion

el control de edicion **no** usa los flags `VITE_DISABLE_EDIT_*` de `env.ts` (existen en config pero ninguna pagina los referencia). el gating real es por rol de usuario via `useAuth().canEdit`:

- `AuthProvider` llama a `permissionsUrl` (`GET /me/permissions`) y calcula `canEdit = data.canEdit || data.role.toLowerCase() === "editor"`
- si `VITE_AUTH_BYPASS === "true"` (solo dev local), `canEdit` es `true` sin llamar al backend
- cada pagina editable lee `const { canEdit } = useAuth()` y deshabilita inputs/botones cuando es `false`

**excepcion:** Blocked ANIs no usa `canEdit` — sus botones de add/edit/delete estan siempre visibles sin gating por rol.

### timezone

el backend guarda todo en UTC. el frontend muestra hora Puerto Rico (UTC-4, sin horario de verano) via helpers en `lib/timeConversion.ts`. la resta es aritmetica fija de 4 horas, no usa timezone real del sistema. cada pagina que muestra fechas documenta abajo como resuelve esa conversion, porque no todas lo hacen igual (algunas convierten desde UTC, otras parsean un offset que ya viene en el string).

---

## Dashboard — `/`

**hooks:** `useCallbacks(PAGINATION_SIZE)` (POST `getCallsInSystem`, trae todo el dataset paginado internamente, tamano configurable via `VITE_CALLBACK_PAGINATION_SIZE`), `useQueues()`.

pagina principal, no es un landing. muestra:
- 5 tarjetas KPI (Pending, Completed, Failed, Cancelled, Rescheduled), calculadas en el cliente filtrando el array completo por status y por la cola seleccionada
- tabla de callbacks con filtro de texto (contact_id, telefono, nombre de cola), filtro por tipo (ASAP/SCHEDULE), por cola, por estado
- columnas: id, telefono, cola, tipo, estado (badge con color), hora de registro, retry, fecha agendada (solo si es SCHEDULE), proxima hora de llamada, cantidad de intentos (boton que abre modal), agente
- modal de detalle: al click en intentos, muestra todos los eventos de `timestamp` del callback ordenados cronologicamente (registered → retry1 → retry2 → retry3 → completed/cancelled/rescheduled/failed)
- boton "Refresh" hace refetch manual

usa `useTransition` para no bloquear la UI con listas grandes (spinner de "filtering" con datasets >1000 filas). no tiene edicion ni export CSV.

---

## Rules & Schedules — `/rules-schedules`

pagina landing pura: 4 tarjetas de navegacion a Queue Schedules, Threshold On/Off, Business Hours y Holidays. sin datos propios.

### Queue Schedules (Calls in System) — `/rules-schedules/queue-schedules`

**hooks:** `useQueues()`; los datos de callbacks vienen del store global (poblado por `useCallbacks` en Dashboard, no hace fetch propio); `useUpdateCallInSystem` (PUT individual), `useBulkUpdateCallInSystemByKeys` (POST masivo).

pese al nombre heredado, esta pagina no gestiona horarios sino reasignacion de cola/estado/timestamp de llamadas individuales:
- tabla con filtro texto + filtro por cola + filtro por estado
- edicion inline por fila: cambiar cola destino (bloqueado si la cola esta inactiva), timestamp (convertido UTC↔PR), estado
- seleccion multiple con checkbox (maximo 500 items), con acciones batch: "Edit Selected" (aplica cambios a todos los seleccionados) y "Delete Selected" (marca status `DELETED`)
- detalle tecnico: si cambia el `call_at` (parte de la sort key en DynamoDB), no se puede actualizar via update individual — el frontend detecta esto y fuerza el uso del endpoint bulk-by-keys aunque sea un solo item

edicion controlada por `canEdit` (columna de checkboxes y botones de accion solo aparecen si el usuario puede editar).

### Business Hours — `/rules-schedules/business-hours`

**hooks:** `useQueueConfiguration()`, `useUpdateQueueConfiguration()`.

lista de colas a la izquierda, panel derecho con horario de apertura/cierre por cola (convertido UTC↔PR). hay una pestana de configuracion adicional (tipo de comportamiento fuera de horario, mensaje personalizado) que existe en el codigo pero esta oculta por un flag hardcodeado — actualmente solo se ve la vista de horarios. diálogo de confirmacion al guardar y al cambiar de cola con cambios sin guardar. edicion controlada por `canEdit`.

### Holidays — `/rules-schedules/holidays`

**hooks:** `useGetHolidays()`, `useQueues()`, `useCreateHoliday()`, `useUpdateHoliday()`; delete es un fetch directo dentro de la pagina.

calendario visual (marca en rojo los dias feriados) + tabla de feriados configurados. por fila: ver overrides por cola (modal de solo lectura), editar, eliminar (con confirmacion).

tipos de feriado configurables:
- deshabilitar completamente los callbacks ese dia
- operacion parcial: permite habilitar colas especificas con su propio horario de apertura/cierre ese dia (override por cola)

la fecha no es editable una vez creado el feriado. en modo "operacion parcial" se exige al menos una cola habilitada para poder guardar. edicion controlada por `canEdit`.

### General Configuration (Threshold On/Off) — `/rules-schedules/general-configuration`

**hooks:** `useThresholdConfiguration()`, `useUpdateThresholdConfiguration()`.

activa/desactiva el servicio de callback globalmente, con confirmacion antes de aplicar. muestra la cantidad actual de llamadas en cola contra los umbrales de activacion/desactivacion configurados, con barra visual de progreso.

la unica pestana visible es "Schedule": tabla de programacion semanal (dia, hora inicio, hora fin, activo/inactivo). hay una pestana adicional de "modo de operacion" (automatico/manual, umbrales ajustables, prioridad agente/cliente) que existe en el codigo pero esta oculta por un flag hardcodeado. validacion: el umbral de desactivacion debe ser menor al de activacion. edicion controlada por `canEdit`.

---

## Callbacks — `/callbacks`

pagina contenedora vacia (solo titulo, sin contenido funcional). existe unicamente para desplegar el submenu del sidebar con las dos paginas reales debajo.

### Queue Configuration (Retries) — `/callbacks/retries`

**hooks:** `useQueueConfiguration()`, `useUpdateQueueConfiguration()`.

una tarjeta editable por cola: cantidad maxima de reintentos (0 a 5 intentos adicionales) e intervalo entre reintentos en minutos (rango valido 5-120, convertido a segundos para el backend). guardado individual por cola, con notificacion de exito/error. edicion controlada por `canEdit`.

### Queue Group Behavior — `/callbacks/queue-group-behavior`

**hooks:** `useQueueGroupInfo()`, `useUpdateQueueGroupInfo()`.

tabla por grupo de colas mostrando el comportamiento configurado cuando se supera el threshold: dejar la llamada en cola normal, u ofrecer callback. editable en linea (guarda inmediatamente al seleccionar, sin confirmacion adicional) si el usuario puede editar.

---

## Connect Contacts Search — `/connect-contacts/search`

**hooks:** `useQueryConnectContacts()` (busqueda), funcion standalone para traer todas las paginas al exportar.

busqueda por lista de telefonos (separados por coma o salto de linea) mas rango de fechas obligatorio. paginacion "Load more" (500 por pagina). export CSV: vuelve a pedir todas las paginas del resultado completo (no solo lo cargado en pantalla), con columnas que incluyen los timestamps de todo el journey del callback. mismo modal de detalle de timestamps que el Dashboard. solo lectura, sin edicion.

## Connect Contacts Report by Date — `/connect-contacts/report-by-date`

**hooks:** `useQueryReportByDate()`, `useGetReports()` (auto-refresh cada 60s), `useGetReportRows()`, `useQueues()`.

formulario de busqueda (telefonos opcionales, fecha inicio/fin, rango maximo de 4 meses, fecha fin maxima ayer). si la busqueda es chica, la respuesta trae los resultados directo; si es grande, el backend genera un reporte asincrono que aparece en "My reports" (tabla con estado, rango, total de filas, boton de descarga CSV cuando termina de procesarse). al seleccionar un reporte ya generado se cargan sus filas paginadas (50 por pagina) en una tabla con columnas dinamicas derivadas de los datos. filtros por tipo/estado/cola sobre los resultados directos cargados. export CSV directo de esos resultados (no de los reportes asincronos, que se descargan aparte).

---

## Concurrency Metrics — `/concurrency-metrics`

**hooks:** `useCallbackConcurrencyMetrics(queueName?, date?)`.

tabla de metricas por slot de 15 minutos, filtrable por cola, fecha y tipo de callback. columnas: ofrecidos, registrados, encolados, total, limite, cantidad de rechazos, % de utilizacion, % de tasa de agendamiento (marcado como aproximado cuando el calculo no es exacto, via tooltip). soporta columnas adicionales que el backend agregue sin requerir cambios en el frontend. ordenamiento por click en cualquier columna. export CSV con las mismas columnas. solo lectura.

## Historical Summary — `/historical-summary`

**hooks:** `useCallbackHistoricalSummary(queueName, date, statuses?, includeDetails=true)`, `useQueues()`.

5 tarjetas KPI por estado (completado/cancelado/reagendado/fallido/pendiente), calculadas sobre el dia completo sin aplicar el filtro de checkboxes (para que reflejen el total real independientemente de lo que se este viendo en la tabla). requiere seleccionar una cola para mostrar la tabla; filtro de fecha y checkboxes de estado que si filtran la tabla.

tabla agrupada por cola + fecha + slot de 15 min + tipo de callback + estado, con el conteo de registros. cada fila es expandible y muestra el detalle de los contactos individuales que componen ese grupo.

**calculo del slot:** toma el timestamp de registro (guardado en UTC), lo interpreta como UTC y le resta 4 horas fijas para obtener hora Puerto Rico, truncando los minutos al bloque de 15 mas cercano hacia abajo — debe coincidir exactamente con la logica de agrupacion del backend para que el detalle expandido caiga en el mismo grupo que el resumen.

paginacion de 25 filas por pagina sobre los grupos ya filtrados. export CSV expande cada grupo a una fila por contacto individual, con fechas convertidas a hora PR. solo lectura.

## Not Accepted Detail — `/not-accepted-detail`

**hooks:** `useCallbackNotAcceptedDetail(date?, callbackQueueName?)`, `useQueues()`.

detalle de contactos que recibieron la oferta de callback pero no llegaron a agendar (ver `not-accepted-detail-pipeline-doc.md` para el pipeline de datos que construye esta informacion en background).

agrupacion por cola + slot de 15 minutos, con: total, cantidad encolada (`outcome = enqueued`) vs cliente colgo (cualquier otro valor, incluido ausente, mostrado como "cust ended"), y tiempo de espera promedio en minutos al momento de la oferta (`ewt_given_minutes`, ignorando valores nulos). filas expandibles con el detalle contacto por contacto: contact_id, hora de entrada al flujo en PR, cola de origen del cliente en el IVR, tipo de callback elegido, resultado, EWT individual.

**calculo del slot:** a diferencia de Historical Summary, aca el timestamp ya viene con el offset de Puerto Rico incluido en el string (`-0400` explicito), asi que el slot se calcula parseando el string directamente, sin aritmetica de fechas.

filtros por cola y fecha (default hoy). ordenamiento clickeable en la tabla de slots. export CSV de los registros individuales sin agrupar. solo lectura, sin controles de edicion ni gating por rol (no aplica, no tiene acciones de escritura).

---

## Blocked ANIs — `/blocked-anis`

**hooks:** `useBlockedAnisView()`, `useCreateBlockedAni()`, `useUpdateBlockedAni()`, `useDeleteBlockedAni()`.

CRUD completo de numeros de telefono bloqueados. busqueda por coincidencia parcial del numero. tabla: telefono, bloqueado hasta, fecha de creacion, estado calculado (activo si la fecha de bloqueo aun no vencio, expirado si ya paso). formularios de alta/edicion con validacion de formato (numero US/PR, `+1` mas 10 digitos) y de que la fecha de bloqueo sea futura. eliminacion con confirmacion y overlay de carga.

**nota:** a diferencia de todas las demas paginas con acciones de escritura, esta no aplica el gating por `canEdit` — los botones de agregar/editar/eliminar estan siempre visibles sin restriccion por rol.

---

## features existentes en codigo pero no activas

- **End of Day Logic** (`EndOfDayLogic.tsx`): no tiene ruta en `App.tsx` ni link activo en el sidebar (el link esta comentado). el archivo esta completo funcionalmente (configura logica de EWT maximo y de "solo permitir agendar para el dia siguiente"), pero su boton de guardar solo simula un delay y no llama a ningun endpoint real. es codigo desactivado, no una feature en produccion.
- pestana de "modo de operacion" en General Configuration: existe en codigo, oculta por flag hardcodeado.
- pestana de "configuracion" (comportamiento fuera de horario) en Business Hours: existe en codigo, oculta por flag hardcodeado.

## paginas de infraestructura (sin logica de negocio)

- `AuthCallback.tsx` — maneja el redirect de OAuth de Cognito
- `LoggedOut.tsx` — pantalla post-logout
