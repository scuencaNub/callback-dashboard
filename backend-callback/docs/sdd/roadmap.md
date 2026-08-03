# Roadmap

## Completado ✅

- Stack Cognito con SAML Azure AD
- CRUD completo de Holiday Calendar
- CRUD de Queue Configuration
- Callback Configuration (SSM Parameter Store)
- Calls in System (query paginado, update individual, bulk update por keys)
- Callback History query (DynamoDB)
- Reports v2 (create job → SQS → process con Athena → S3 CSV → download)
- User ACL (email → role, endpoint `/me/permissions`)
- Concurrency Metrics endpoint
- Pipeline CI/CD (CodePipeline + CodeBuild)
- Ambientes CRT / BETA / PRD con samconfig separados
- Lambda versioning con AutoPublishAlias: live
- Shared Layer (api_rest + client wrappers)
- Spec de validación local fase 1 (pytest + sam local invoke para GetCallsInSystem)

## En progreso 🔄

- Expandir cobertura de tests (unit + smoke para más Lambdas)
- Documentación SDD del proyecto (este directorio)
- **Merge QueueRegisterStats + ConcurrencyMetrics**: enriquecer el endpoint `/callback-concurrency-metrics` con datos de la tabla `Callback-QueueRegisterStats` (cust_registered, cust_register_pending). Ver spec en `.kiro/specs/merge-queue-register-stats/`. ✅ Backend completo, frontend con % de registro.

## Backlog 📋

- Tests automáticos en pipeline (stage Test en beta)
- Eventos SQS para smoke tests de consumers (ProcessReportByDate)
- Server-side pagination para reportes grandes (>10k rows en frontend)
- Feature flags con AppConfig
- Canary deployments con CodeDeploy + alarmas CloudWatch
- Mejorar search-by-date (ver `docs/mejorar-search-by-date.txt`)
