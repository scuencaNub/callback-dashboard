# Tech Stack

## Infrastructure as Code

- **AWS SAM** (CloudFormation transform)
- 3 stacks independientes:
  - `1.sam-callbacks-cognito/` — Cognito User Pool + SAML
  - `2.sam-callbacks-endpoints/` — API Gateway + Lambdas + recursos
  - `3.sam-callback-cloudfront/` — CDN + S3 para frontend SPA

## Backend

- **Runtime**: Python 3.12
- **Handlers**: vanilla (sin framework web), cada Lambda en su directorio con `handler.py` + `requirements.txt`
- **Shared Layer**: código compartido montado como Lambda Layer
  - `api_rest/` — CORS, auth (editor_authorization), logging, HTTP response factory, serializers
  - `client/` — wrappers para DynamoDB, SSM, EventBridge, Step Functions

## Auth

- **Cognito User Pool** con SAML (Azure AD de Evertec)
- **API Gateway Cognito Authorizer** (JWT en header Authorization)
- **ACL interno**: tabla DynamoDB `UserAcl` (email → role), verificado en Lambdas de escritura

## Storage

| Servicio | Uso |
|----------|-----|
| **DynamoDB** | Calls in system, holiday calendar, queue config, concurrency metrics, user ACL, reports metadata |
| **SSM Parameter Store** | Callback configuration (JSON) |
| **S3** | Reportes CSV generados, frontend assets |
| **Athena** | Queries sobre CTR data histórica en S3 |
| **SQS** | Cola de jobs para generación async de reportes |

## Frontend

- SPA (repo separado, no incluido aquí)
- Hosting: S3 + CloudFront
- Auth flow: Cognito Hosted UI → SAML → Azure AD
- Build: `pnpm build`, sync a S3

## Environments

| Env | Config SAM | Cuenta AWS | Uso |
|-----|-----------|------------|-----|
| **CRT** | `samconfig-crt.toml` | Dev | Desarrollo y pruebas técnicas |
| **BETA** | `samconfig-beta.toml` | PRD | Validación con datos reales, stack separado |
| **PRD** | `samconfig-prd.toml` | PRD | Producción real |

## CI/CD

- **Pipeline**: CodePipeline + CodeBuild
- **Flujo**: Source → Deploy Beta → (Test) → Manual Approval → Deploy Prod
- **Versioning**: `AutoPublishAlias: live` en todas las Lambdas
- **Deploy**: `sam build` + `sam deploy --config-file <env>.toml`

## Testing

| Capa | Qué testea | Herramienta | Cuándo |
|------|-----------|-------------|--------|
| Unit | Lógica pura, imports | pytest + mocks | Pre-deploy, local |
| Contract | Template SAM válido | cfn-lint | Pre-deploy, local |
| Smoke | Handler arranca sin error | sam local invoke | Pre-deploy, local |
| Integration | Endpoints reales | HTTP contra API | Post-deploy (moderación) |

## Observability

- `aws-lambda-powertools` (logging, metrics, tracing)

## Conventions

- **Endpoints**: kebab-case (`/holiday-calendars/{date}`)
- **Código Python**: snake_case (directorios y módulos)
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`)
- **Config por ambiente**: `samconfig-{env}.toml` con parameter overrides
