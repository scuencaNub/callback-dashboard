# Constitution (Guardrails)

Reglas que aplican a todo el proyecto. Cualquier feature o fix debe respetarlas.

## Backward Compatibility

- No romper endpoints existentes. Cambios de contrato HTTP requieren versionado o feature flag.
- DynamoDB tables con `DeletionPolicy: Retain` — nunca se borran por accidente en un deploy.

## Security

- Toda operación de escritura verifica rol `editor` via `editor_authorization.py` + tabla UserAcl.
- API Gateway usa Cognito Authorizer (JWT). No hay endpoints públicos excepto OPTIONS (CORS preflight).
- No hardcodear secrets. Configuración sensible va en SSM Parameter Store.

## Testing pre-deploy

- `pytest` debe pasar antes de cualquier deploy.
- `cfn-lint template.yaml` debe pasar (contract test).
- `sam build` exitoso es requisito para deploy.
- No mutar datos reales en tests automatizados: unit tests con mocks, smoke con eventos mínimos (OPTIONS).

## Deploy

- Flujo obligatorio: CRT → BETA → PRD.
- No deployar directo a PRD sin validar en BETA.
- Manual approval requerido antes de PRD en pipeline.
- Usar `--config-file samconfig-{env}.toml` siempre.

## Código

- Runtime: Python 3.12 (consistente con `template.yaml`).
- Cada Lambda en su directorio con `handler.py` + `requirements.txt`.
- Código compartido va en `shared_layer/python/`, no se duplica entre Lambdas.
- Conventional Commits para mensajes de commit.

## Observability

- Usar `aws-lambda-powertools` para logging estructurado.
- Lambdas con timeout explícito (30s default, 300s para queries Athena, 900s para procesamiento de reportes).
