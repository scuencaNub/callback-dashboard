# Local validation (pytest + SAM invoke) — Spec

Este documento sigue la idea de **Spec-Driven Development**: la especificación es la fuente de verdad; el código y los scripts la implementan. Referencia metodológica: [Spec-Driven Development](https://specdriven.ai/).

---

## Constitution (guardrails)

- **Runtime objetivo**: Python 3.12 (igual que `template.yaml`).
- **Sin mutar datos reales** en tests automatizados: unit tests con mocks; smoke `sam local invoke` con eventos mínimos (`OPTIONS` o bodies vacíos cuando el handler lo permita).
- **Dos barreras antes de deploy manual**:
  1. `pytest` (rápido, en máquina del dev).
  2. `sam local invoke` (más fiel al empaquetado Lambda; ideal con `sam build --use-container`).
- **No sustituye** validación en cuenta real si el endpoint depende de recursos que solo existen en AWS (pero sí atrapa `ImportModuleError`, timeouts obvios, y errores de empaquetado).

---

## Specify (qué y por qué)

### Objetivo

Detectar **antes de deploy** fallas que ya vimos en producción:

- Dependencias faltantes en el artefacto Lambda (`Runtime.ImportModuleError`).
- Handlers que no arrancan por imports rotos.
- Regresiones básicas de contrato HTTP (status codes esperados en caminos simples).

### Alcance actual (fase 1)

- **Una sola Lambda API**: `GetCallsInSystemFunction`.
- **Un solo evento**: `OPTIONS /getCallsInSystem` (no consulta DynamoDB en el handler actual).

### Fuera de alcance (por ahora)

- Cobertura completa de negocio (paginación, filtros, permisos ACL en todas las Lambdas).
- Lambdas disparadas por **SQS** (p. ej. `ProcessReportByDateFunction`): requieren **shape de evento SQS**, no API Gateway.
- Pruebas de carga.

---

## Clarify (ambigüedades resueltas)

| Pregunta | Decisión |
|----------|----------|
| ¿`.venv` basta para validar deps Lambda? | **No del todo**. Sirve para `pytest`, pero **no garantiza** el mismo site-packages que empaqueta SAM. Por eso existe la segunda barrera `sam local invoke`. |
| ¿Un array de nombres de Lambda alcanza? | Mejor un **manifest de pares** `LogicalId` + `event.json`, porque el evento válido cambia por recurso/método. |
| ¿`sam local invoke` pega a AWS? | Puede hacerlo si el código llama AWS sin mock y tenés credenciales; por eso empezamos con `OPTIONS` mínimos. |

---

## Plan (blueprint técnico)

1. **Unit / import tests (`pytest`)**  
   - Carpeta: `tests/`.  
   - Instalación: `python3 -m pip install -r tests/requirements.txt` + requirements de las funciones que importás en tests.

2. **Smoke `sam local invoke`**  
   - Eventos: `events/*.json`.  
   - Script: `scripts/sam-local-smoke.sh` lee una lista de pares `FunctionLogicalId|events/....json` y ejecuta `sam local invoke` en secuencia (**fail-fast**).

3. **Expansión**  
   - Agregar un evento `OPTIONS` (o mínimo válido) por cada recurso API en `template.yaml`.  
   - Registrar el par en el manifest del script.  
   - Para `ProcessReportByDateFunction`, agregar evento tipo SQS (fase distinta).

---

## Tasks (desglose atómico)

- [x] Fase 1: evento `events/get_calls_in_system_options.json`.
- [x] Fase 1: script `scripts/sam-local-smoke.sh` con un solo par.
- [ ] Fase 2: eventos `OPTIONS` para el resto de funciones API (una por ruta).
- [ ] Fase 3: unit tests por handler crítico (mocks, sin AWS).
- [ ] Fase 4: eventos SQS para consumers (donde aplique).

---

## Acceptance criteria (fase 1)

- `python3 -m pytest tests -q` pasa en un venv con dependencias instaladas.
- `sam build` (opcional `--use-container`) genera build válido.
- `scripts/sam-local-smoke.sh` termina con código 0 y cada invoke devuelve `statusCode` 200 para el caso `OPTIONS` de GetCallsInSystem.

---

## Comandos (referencia rápida)

```bash
cd 2.sam-callbacks-endpoints

python3 -m pip install -r tests/requirements.txt
python3 -m pip install -r update_callback_configuration/requirements.txt
python3 -m pip install -r get_user_permissions/requirements.txt
python3 -m pytest tests -q

sam build --use-container   # recomendado antes de invoke
./scripts/sam-local-smoke.sh
```
