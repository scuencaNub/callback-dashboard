# Mission

## Qué es

Plataforma de gestión y monitoreo de callbacks de Amazon Connect para BPPR (Banco Popular de Puerto Rico).

## Problema que resuelve

Los supervisores y operadores del contact center necesitan visibilidad y control sobre el sistema de callbacks: ver llamadas pendientes, editar estados, configurar colas y horarios, gestionar feriados, y generar reportes históricos. Sin esta herramienta, esas operaciones dependen de acceso directo a consolas AWS o procesos manuales.

## Usuarios

- **Operadores / Supervisores** del contact center BPPR (autenticados via Azure AD / SAML).
- **Editores** (rol ACL): pueden modificar configuraciones, calendarios y estados de llamadas.
- **Viewers** (rol implícito): solo lectura.

## Capacidades principales

- Consultar y editar llamadas en sistema (calls in system).
- Configurar parámetros de callback (concurrencia, horarios, colas).
- Gestionar calendarios de feriados que afectan la operación.
- Generar reportes históricos de callbacks por fecha (async, via Athena).
- Controlar acceso por roles (ACL basado en email).

## Contexto

- **Brownfield**: ya está en producción con usuarios reales.
- **Multi-stakeholder**: backend mantenido por equipo Nubity/Evertec, configuración SAML depende de equipo Evertec (Azure AD).
- Toda evolución debe ser incremental, backward-compatible y con validación pre-deploy.
