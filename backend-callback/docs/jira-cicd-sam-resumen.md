# Resumen para Jira - Implementación CI/CD SAM

Se implementó un proceso CI/CD para Lambdas basado en AWS SAM, con foco en despliegues controlados por entorno.

## Alcance realizado

- Creación y configuración de repositorio para versionado del proyecto.
- Build automatizado con CodeBuild (`sam build` + `sam deploy`).
- Pipeline inicial con estrategia de dos entornos:
  - **Beta** para validación previa.
  - **Producción** como destino final.
- Configuración por entorno con archivos SAM config dedicados (`beta` y `prod`).

## Problema que resuelve

- Estandariza y automatiza deployments.
- Reduce errores manuales y diferencias entre entornos.
- Mejora control de cambios al permitir promoción progresiva.

## Próximo paso planificado

- Agregar stage de tests automáticos en beta.
- Incorporar **manual approval** antes del deploy a producción.
- Ejecutar deploy productivo con configuración dedicada de prod.

