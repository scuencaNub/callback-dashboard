# Deploy a CERT y Prod

Escenario ideal, creando todos los recursos desde cero (Es necesaria configuración desde el lado de Evertec)

## Pasos:

### Deployar Cognito

- Ejecutar el deployment del stack de Cognito
- Guardar la información del deploy (UserPoolId, UserPoolClientId, UserPoolDomain, HostedUIURL)
- Enviar estos datos al equipo correspondiente (Arturo) para que configuren desde su lado.

**Identifier (Entity ID):** Ej. `urn:amazon:cognito:sp:us-west-2_PYqrpEATu`

**Reply URL (ACS):** Ej. `https://callback-user-pool.auth.us-west-2.amazoncognito.com/saml2/idpresponse`

### Deployar Cloudfront (Sin contenido, eso se hace para obtener la URL)

- Obtener la URL y modificar Cognito (redeployando o agregando la URL en los dominios permitidos)

### Deployar Endpoints

En esta instancia ya tenemos todo lo necesario para configurar Cognito y las variables de entorno necesarias para crear los endpoints.

- Ejecutar el deployment del stack de endpoints (API Gateway + Lambdas)

### Build y Sync del Frontend

- Buildear el frontend (`pnpm build`)
- Sincronizar los archivos generados en el bucket de S3 creado en el paso 3 (CloudFront)
- Agregar los endpoints y la configuración de cognito en el frontend.

---

# Deploy a un ambiente existente (bpac-prd)

El ambiente productivo usa un unico ambiente AWS (cuenta bpac-prd) con dos stacks diferenciados por nombre y por el mode del frontend: **beta** y **prod**. Ambos stacks consumen datos productivos de Amazon Connect.

No hay un ambiente CERT separado en AWS para el dashboard. El testing se hace en el stack beta antes de promover a prod.

## Modelo de stacks

| Stack | Backend samconfig | Frontend mode | API Gateway |
|---|---|---|---|
| beta | `samconfig-beta.toml` | `--mode beta` | `2p2edmv0b8...Prod` |
| prod | `samconfig-prd.toml` | `--mode prd` | `4q120yll5c...Prod` |

Cognito es compartido entre ambos stacks (mismo User Pool `us-east-1_tJImiT9rX` y App Client).

**Cognito (bpac-prd):**
- **User Pool ID:** `us-east-1_tJImiT9rX`
- **App Client ID:** `3en1indhbehp5itrfa2m6kvi82`
- **Identifier (Entity ID):** `urn:amazon:cognito:sp:us-east-1_tJImiT9rX`
- **Reply URL (ACS):** `https://callback-user-pool.auth.us-east-1.amazoncognito.com/saml2/idpresponse`

## Deploy de endpoints

Desde `2.sam-callbacks-endpoints/`:

```bash
# beta
sam build --no-cached
sam deploy --config-file samconfig-beta.toml --profile <tu-profile>

# prod
sam build --no-cached
sam deploy --config-file samconfig-prd.toml --profile <tu-profile>
```

Si el build falla por conflicto de dependencias pip:
```bash
py -3.12 -m pip cache purge
sam build --no-cached
```

## Build y Sync del Frontend

Desde `frontend-callback/frontend-prod/`:

```bash
# beta
corepack pnpm build --mode beta
aws s3 sync dist/ s3://bpac-prd-callback-beta-frontend --profile <tu-profile> --delete
aws cloudfront create-invalidation --distribution-id E3N786PI6N1V0O --paths "/*" --profile <tu-profile>

# prod
corepack pnpm build --mode prd
aws s3 sync dist/ s3://bpac-prd-callback-frontend --profile <tu-profile> --delete
aws cloudfront create-invalidation --distribution-id E3IYYHAXEF9YDV --paths "/*" --profile <tu-profile>
```

**Importante:** el archivo `.env.prd.local` (y `.env.beta.local`) deben tener `VITE_AUTH_BYPASS=false` explícito. El archivo `.env.local` (para desarrollo local) tiene `VITE_AUTH_BYPASS=true` y vite lo carga siempre, por lo que si el env del entorno no lo sobreescribe el build sale con bypass activado.

## Orden recomendado

Siempre deployar el backend antes del frontend. Los campos nuevos del backend son aditivos, el frontend viejo los ignora sin romper.

