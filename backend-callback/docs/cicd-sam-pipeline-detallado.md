# CI/CD SAM con CodeBuild + CodePipeline (Detalle interno)

## Objetivo

Implementar un flujo repetible de despliegue para Lambdas con AWS SAM, usando:

- Repositorio de código (CodeCommit).
- Build y deploy automatizado (CodeBuild + `sam build` / `sam deploy`).
- Pipeline con entornos separados (beta y prod).
- Promoción controlada entre entornos (manual approval antes de producción).

## Qué problema resuelve este procedimiento

- Evita deploys manuales inconsistentes.
- Estandariza build y deploy para cualquier proyecto similar.
- Permite validar primero en beta y recién después pasar a prod.
- Reduce riesgo operativo al agregar una compuerta de aprobación manual.
- Deja trazabilidad completa del ciclo de release.

## Arquitectura implementada (patrón)

1. **Source**: cambios en repo.
2. **Deploy Beta**: `sam build` + `sam deploy` con configuración beta.
3. **(Siguiente paso)** Stage de tests automáticos en beta.
4. **Manual approval**.
5. **Deploy Prod**: mismo proceso con configuración prod.

## Configuración por entorno

Se definieron configuraciones separadas para deploy:

- `samconfig-beta.toml`
- `samconfig-prod.toml`

Cada entorno define su `stack_name` y parámetros de deploy (capabilities, bucket, región, etc.).

## Problemas reales que tuvimos y cómo se resolvieron

### 1) Errores intermitentes de `sam deploy` con comandos multilínea

- Síntoma: `sam deploy` reportaba faltantes de parámetros (`--stack-name`) aunque estaban presentes.
- Causa: en algunos intentos, el parseo de líneas con `\` en `buildspec.yml` no quedaba consistente.
- Acción: simplificar comando en una sola línea para eliminar ambigüedad de shell/YAML.

### 2) Uso de `--config-file` y validación del stack

- Síntoma: con `--config-file` aparecía `AWS::EarlyValidation::ResourceExistenceCheck`.
- Causa real posterior: no era el pipeline, sino validación de CloudFormation sobre recursos referenciados al crear stack nuevo.
- Acción: depuración con CloudFormation (`list-change-sets`, `describe-change-set`, `describe-stack-events`) y ajuste de nombres/recursos.

### 3) Colisión de nombre de Lambda entre entornos

- Síntoma: al crear stack beta/prod aparecía validación fallida o conflicto.
- Causa: `FunctionName` fijo (`demo-pipeline-lambda`) compartido por distintos stacks.
- Acción recomendada: usar nombre dinámico por stack/entorno (por ejemplo con `!Sub`) o dejar que CloudFormation lo genere.

### 4) Diferencias entre ejecución local y en CodeBuild

- Síntoma local: `sam build` fallaba por runtime Python (`python3.11` no disponible en PATH).
- Causa: entorno local sin runtime compatible.
- Acción: instalar runtime correcto o usar `sam build --use-container`.

### 5) Permisos S3 al hacer deploy local

- Síntoma: `AccessDenied` en `PutObject` al subir artefactos.
- Causa: el perfil local no tenía permisos sobre bucket de artefactos.
- Acción: usar perfil con permisos correctos o bucket con policy adecuada para ese principal.

## Estado alcanzado

- Se validó patrón con CodeBuild ejecutando SAM.
- Se confirmó uso de config file de SAM para parámetros de entorno.
- Quedó definido el flujo objetivo beta -> (test) -> approval -> prod.

## Próximos pasos recomendados

1. Agregar stage **Test** contra beta (smoke/invoke).
2. Dejar **Manual approval** obligatorio antes de prod.
3. Deploy a prod usando `samconfig-prod.toml`.
4. Plantillar este patrón para replicarlo en otros proyectos.

