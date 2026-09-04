# Changelog

## BPPR-994 — dashboard de detalle "not accepted" (callback ofrecido, no agendado)

feature nueva completa: pipeline de datos + endpoint + pagina de frontend. release de backend, stack y frontend a beta y prod (cuenta bpac-prd).

### que resuelve

hasta ahora el dashboard solo mostraba totales agregados de callback (offered/registered/enqueued) por slot. no habia forma de ver el detalle de que contactos recibieron la oferta de callback y no llegaron a agendar ("not accepted"), ni por que EWT tenian en ese momento ni por que queue de origen entraron.

### flujo de datos (pipeline)

el pipeline corre de forma independiente al endpoint, en 3 pasos encadenados:

1. **trigger** (`BPAC-PRD-NotAcceptedScheduleTrigger`, lambda disparada por el DynamoDB Stream de `ActiveContactsInFlow`, filtrada a records con `callback_already_offered=true`): por cada contacto que recibio la oferta, crea un schedule one-time en EventBridge Scheduler con delay de 5 minutos (`DELAY_SECONDS`), apuntando a la lambda constructora. el schedule se autoelimina despues de ejecutarse.
2. **constructora** (`BPAC-PRD-GetNotAcceptedDetail`, invocada por el schedule): a los 5 minutos, revisa si el `contact_id` existe en `CallsInSystem` (agendo). si no existe, enriquece el registro con los campos de `ActiveContactsInFlow` (`ewt_given`, `origin_queue_arn`, `selected_callback_type`, `outcome`, `active_flow`) y lo escribe en la tabla nueva `BPAC-PRD-Callback-NotAcceptedDetail` (GSI `queue_name-start_timestamp-index`).
3. **flujo de Connect** (`callback inbound - in hours.json`): se agregaron dos parametros dinamicos en todas las invocaciones de `TrackEntry` — `ewt_given` (`$.Attributes.oldest_contact_age_max`, el EWT real al momento de la oferta) y `origin_queue_arn` (`$.Attributes.queue_arn_to_avg`, la queue de origen del cliente en el IVR, distinta de la queue de callback) — mas `InvocationTimeLimitSeconds=8` en todos los nodos. sin este cambio esos dos campos no existian en `ActiveContactsInFlow` y el pipeline no tenia de donde enriquecer.

correccion de datos historicos: 141 registros con `ewt_given` guardado como string literal (bug de un deploy anterior del flujo) se corrigieron via script (`fix_ewt_given.py`) que consulto `GetContactAttributes` por contact_id y actualizo solo ese campo en dynamo (update parcial, sin tocar el resto del item).

### backend — endpoint nuevo (2.sam-callbacks-endpoints)

`GetCallbackNotAcceptedDetailFunction`, `GET /callback-not-accepted-detail`:
- parametros: `date` (requerido, `YYYY-MM-DD` hora PR) y `callback_queue_name` (opcional; si se omite, itera todas las queues de `QueueConfiguration`)
- lee `BPAC-PRD-Callback-NotAcceptedDetail` via GSI por queue + rango de fecha (no hace scan completo — la tabla tiene decenas de miles de items)
- resuelve `origin_queue_arn` -> `origin_queue_name` via `get_item` en `QueueAssociation`, con cache en memoria por invocacion
- convierte `ewt_given` (segundos, como se guarda en dynamo) a `ewt_given_minutes` con `math.ceil()`, redondeando siempre hacia arriba. el campo en segundos no se expone en la respuesta
- devuelve `{items: [...], count: N}` ordenado por `start_timestamp`

### backend — stack / template (template.yaml)

decision de arquitectura: las piezas del pipeline (`GetNotAcceptedDetailFunction`, `NotAcceptedScheduleTriggerFunction`, `NotAcceptedSchedulerRole`, el event source mapping sobre el stream de `ActiveContactsInFlow`, y la tabla `NotAcceptedDetailTable`) son **infraestructura compartida de construccion de datos** entre beta y prod (mismas lambdas fisicas, sin sufijo de ambiente, misma cuenta AWS). no estan gestionadas por este template — solo vive aqui el endpoint HTTP.

se aplico en 2 pasos para evitar que el stack intentara borrarlas:
1. se agrego `DeletionPolicy: Retain` + `UpdateReplacePolicy: Retain` a los 4 recursos mientras seguian en el template, se deployo — CloudFormation los actualizo sin recrearlos (`Replacement: False`)
2. se removieron los 4 recursos del template — con `Retain` ya vigente, el deploy los desvincula del stack (`DELETE_SKIPPED` en los eventos) sin borrarlos fisicamente. verificado post-deploy: mismo `LastModified` en ambas lambdas, tabla con sus items intactos, event source mapping `Enabled`

el stack de prod nunca tuvo estos 4 recursos en su estado, por lo que su deploy no los menciona en absoluto.

parametros nuevos en `Parameters`: `QueueAssociationTableName`, `NotAcceptedDetailTableName`.

### backend — config de deploy (samconfig-beta.toml / samconfig-prd.toml)

se agregaron los overrides `QueueAssociationTableName` y `NotAcceptedDetailTableName` a ambos entornos, apuntando a las tablas productivas existentes.

### frontend — modulo frontend-prod

- pagina nueva `pages/CallbackNotAcceptedDetail.tsx` + hook `hooks/queries/useCallbackNotAcceptedDetail.ts`, siguiendo el mismo patron que `CallbackConcurrencyMetrics.tsx`
- agrupa los registros individuales del endpoint por `queue_name + time_slot` (slot de 15 min sobre `start_timestamp`): tabla con Total / Enqueued / Cust Ended / EWT promedio por slot
- filas expandibles con el detalle de contact_ids (contact_id, start_timestamp en hora PR, origin_queue_name, callback_type, outcome, ewt_given_minutes)
- sin `outcome` en el registro se interpreta como "cust ended" por default
- ruta `/not-accepted-detail` (`App.tsx`), item de sidebar (`appSidebar.tsx`), strings i18n en/es (`TranslationProvider.tsx`)
- config de URL: `VITE_CALLBACK_NOT_ACCEPTED_DETAIL_URL` agregada a `.env.beta.local`, `.env.local` y `.env.prd.local` (esta ultima apuntando al API gateway de prod `4q120yll5c`, no al de beta)

### deploy — pasos por entorno

backend (desde 2.sam-callbacks-endpoints):
- beta: `sam build --no-cached` y `sam deploy --config-file samconfig-beta.toml --profile bpac-prd`
- prod: `sam build --no-cached` y `sam deploy --config-file samconfig-prd.toml --profile bpac-prd`
- validado en beta primero (237 registros de prueba con datos consistentes) antes de promover a prod
- changeset de prod revisado antes de confirmar: solo `Add`/`Modify` sobre el endpoint nuevo y las versiones/alias normales de las demas lambdas (sync pendiente desde el ultimo deploy), sin `Delete`/`Replace` sobre infra compartida

frontend (desde frontend-callback/frontend-prod):
- `npm run build -- --mode prd`
- `aws s3 sync dist/ s3://bpac-prd-callback-frontend --profile bpac-prd --delete`
- `aws cloudfront create-invalidation --distribution-id E3IYYHAXEF9YDV --paths "/*" --profile bpac-prd`

### pendiente (no incluido en este release)

- importar el flujo de Connect modificado (`callback inbound - in hours.json`) al flujo productivo real en Connect
- smoke test contra la URL de prod con usuario real autenticado (post-deploy solo se verifico infraestructura, no un request end-to-end autenticado)

## BPPR-994 — fix horarios PR en historical summary (solo front)

correccion de UI a beta y prod. sin cambios de backend ni de stack.

### frontend — modulo frontend-prod

- `pages/CallbackHistoricalSummary.tsx`: los timestamps del detalle expandible venian crudos en UTC (call_at y cb_registered), generando desfase de 4h respecto al time slot
- helper nuevo `formatUtcToPr`: convierte UTC a hora PR (UTC-4, sin DST), mismo criterio que ya usaba el calculo de slot
- aplicado en las celdas `Call At` y `Registered At` del detalle y en las columnas equivalentes del CSV export
- el calculo del slot de agrupacion queda intacto (sigue usando el call_at UTC crudo)

### deploy

- solo front: build por mode + sync al bucket + invalidacion de cloudfront
- validado en local (`corepack pnpm dev --mode beta`, con login cognito) antes de prod
- prod: `corepack pnpm build --mode prd`, sync a `bpac-prd-callback-frontend`, invalidacion `E3IYYHAXEF9YDV`
- verificacion previa al sync: confirmar que el bundle no incluye `dev-bypass-token` (`Select-String -Path dist/assets/*.js -Pattern "dev-bypass-token" -Quiet` debe dar False)

## BPPR-994 — concurrency metrics por slot + registration rate + filtro unset

release de backend (SAM endpoints) y frontend a beta y prod (cuenta bpac-prd, mismo profile, distinto stack por entorno).

### backend — modulo endpoints (2.sam-callbacks-endpoints)

lambda `get_callback_concurrency_metrics` (handler.py):
- filtro de filas con `callback_type` vacio: no se devuelven al front (constante `UNSET_CALLBACK_TYPE`, filtro en `_aggregate`)
- campo nuevo `scheduling_rate_pct` por slot: `registered / offered * 100`
- flag nuevo `scheduling_rate_approx`: true cuando `registered > offered` en el slot
- ambos campos quedan fuera del `count` cuando la fila es de tipo unset (se filtra antes)

### backend — stack / template (template.yaml)

- se elimino el recurso `AniBlockedTable` (AWS::DynamoDB::Table). la tabla `BPAC-PRD-ani-blocked` ya existe en la cuenta (productiva) y se referencia por nombre via el parametro `AniBlockedTableName`, igual que las demas tablas productivas. declararla como recurso colisionaba con la tabla existente (ResourceExistenceCheck fallaba en el deploy de prod)
- las otras dos tablas que el stack si crea (`UserAclTable`, `CallbackReportsTable`) quedaron sin cambios

### backend — config de deploy (samconfig-prd.toml)

el `parameter_overrides` de prod estaba desactualizado respecto a beta. se agregaron los overrides que la lambda de concurrency por slot necesita, tomados de beta (tablas productivas compartidas):
- `ActiveContactsInFlowTableName=BPAC-PRD-Callback-ActiveContactsInFlow`
- `RegistrationIndexTableName=BPAC-PRD-Callback-RegistrationIndex`
- `QueueOperationHoursTableName=BPAC-PRD-BPPR-ACE-TableQueueOperationHours-1P3EC19D2UXWZ`
- `AniBlockedTableName=BPAC-PRD-ani-blocked`
- `CallbackLimitAsap=120`, `CallbackLimitSchedule=20`

sin estos overrides, `ActiveContactsInFlowTableName` y `RegistrationIndexTableName` llegaban vacios (default "" en el template) y rompian la validacion temprana del changeset.

### backend — proceso de build (SAM)

- el resolver de pip puede entrar en backtracking no determinista y fallar con `ResolutionImpossible` o `Could not satisfy the requirement`. no es un problema de codigo ni de requirements
- fix: limpiar cache de pip y rebuildear
  - `py -3.12 -m pip cache purge`
  - `sam build --no-cached`
- requiere python 3.12 y aws sam cli instalados; pip actualizado (25.x disparaba el backtracking, 26.x lo resolvio)

### frontend — modulo frontend-prod

codigo:
- `pages/CallbackConcurrencyMetrics.tsx`: columna nueva "% Registration Rate" (con marca ~ para aproximados), ordenable, incluida en el CSV. los campos `scheduling_rate_pct` / `scheduling_rate_approx` quedan fuera de las columnas dinamicas
- `pages/CallbackHistoricalSummary.tsx`: fix de key duplicada en el detalle expandible (se agrego index a la key)
- `components/ui/table.tsx`: prop `containerClassName` para que el scroll y el header sticky vivan en el mismo contenedor
- headers sticky en las tablas de concurrency y historical summary (`sticky top-0` + fondo opaco, altura acotada en el contenedor)
- `components/TranslationProvider.tsx`: labels EN/ES para el registration rate

config de entorno (.env.prd.local) — CRITICO, causo incidentes en prod:
- `VITE_AUTH_BYPASS=false` debe estar explicito. vite carga `.env.local` siempre (tiene bypass=true para dev local); si prd no lo sobreescribe, el build sale con auth bypass y el authorizer cognito rechaza todo (401 enmascarado como CORS)
- todos los endpoints deben estar declarados. si falta una `VITE_..._URL`, el front cae a un fallback hardcodeado viejo (`6orzydazih`) que no tiene las rutas ni CORS. faltaban y se agregaron:
  - `VITE_CALLBACK_HISTORICAL_SUMMARY_URL`
  - `VITE_BLOCKED_ANIS_URL`
- regla general: `.env.prd.local` debe quedar completo y alineado con `.env.beta.local`, apuntando al API gateway de prod (`4q120yll5c`)

### deploy — pasos por entorno

backend (desde 2.sam-callbacks-endpoints):
- beta: `sam build --no-cached` y `sam deploy --config-file samconfig-beta.toml --profile bpac-prd`
- prod: `sam build --no-cached` y `sam deploy --config-file samconfig-prd.toml --profile bpac-prd`
- si el build falla por pip: `py -3.12 -m pip cache purge` y rebuild

frontend (desde frontend-callback/frontend-prod):
- build por entorno con el mode correspondiente: `corepack pnpm build --mode beta` o `--mode prd`
- sync al bucket de S3 del entorno:
  - prod: bucket `bpac-prd-callback-frontend`, distribution cloudfront `E3IYYHAXEF9YDV` (d1f2o9mv2do2d5)
  - beta: bucket `bpac-prd-callback-beta-frontend`, distribution `E3N786PI6N1V0O` (d103jhhtyt1ay0)
- `aws s3 sync dist/ s3://<bucket> --profile bpac-prd --delete`
- invalidar cache: `aws cloudfront create-invalidation --distribution-id <id> --paths "/*" --profile bpac-prd`
- orden: primero backend, despues frontend (los campos nuevos son aditivos, el back es backward compatible)

---

All notable changes to Engram are documented here.

This project follows [Conventional Commits](https://www.conventionalcommits.org/) and uses [GoReleaser](https://goreleaser.com/) to auto-generate GitHub Release notes from commit history on each tag push.

## Where to Find Release Notes

Full release notes with changelogs per version live on the **[GitHub Releases page](https://github.com/Gentleman-Programming/engram/releases)**.

GoReleaser generates them automatically from commits, filtering by type:
- `feat:` / `fix:` / `refactor:` / `chore:` commits appear in the release notes
- `docs:` / `test:` / `ci:` commits are excluded from the generated changelog

## Breaking Changes

Breaking changes are always marked with a `type:breaking-change` label and documented in the release notes with a migration path. The `fix!:` and `feat!:` commit format triggers a major version bump.

## Unreleased

<!-- Changes that are merged but not yet released are tracked here until the next tag. -->

- **feat(project):** add project name auto-detection via git remote and normalization (lowercase + trim + collapse) on all read/write paths
- **feat(cli):** add `engram projects list|consolidate|prune` commands for project hygiene
- **feat(mcp):** add `mem_merge_projects` tool for agent-driven project consolidation
- **feat(mcp):** auto-detect project at MCP startup via `--project` flag, `ENGRAM_PROJECT` env, or git remote
- **feat(mcp):** similar-project warnings when saving to a new project that resembles an existing one
- **fix(sync):** use git remote detection instead of `filepath.Base(cwd)` for project name
