# Callbacks Management System

## Prerequisitos

Antes de deployar el frontend, asegúrate de tener desplegados **Cognito User Pool** y **CloudFront Distribution**. El bucket S3 debe estar configurado como origen de CloudFront.

## Deployment

### 1. Build

Ejecuta el build con el modo correspondiente al entorno:

```bash
pnpm run build --mode crt  # Para CRT
# o
pnpm run build --mode prd  # Para Producción
```

El build se genera en la carpeta `dist/`.

### 2. Subir a S3

Sincroniza los archivos del build al bucket S3 de CloudFront:

```bash
cd dist
aws s3 sync . s3://bpac-crt-callback-cloudfront-bucket --profile bppr-crt
```

**Nota:** El bucket debe coincidir con el configurado como origen en CloudFront.

### 3. Invalidar CloudFront (opcional)

Si necesitas invalidar la caché de CloudFront:

```bash
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*" \
  --profile bppr-crt
```

## 🔧 Configuración

Crea un archivo `.env.local` con las variables de entorno necesarias:

```env
# API Endpoints
VITE_HOLIDAY_URL=
VITE_QUEUE_URL=
VITE_THRESHOLD_URL=
VITE_CALLBACK_URL=
VITE_UPDATE_CALL_IN_SYSTEM_URL=
VITE_UPDATE_CALLBACK_CONFIGURATION=
VITE_UPDATE_QUEUE_CONFIGURATION=
VITE_BULK_UPDATE_CALL_IN_SYSTEM_BY_KEYS_URL=
VITE_QUERY_CALLBACK_HISTORY_URL=

# Feature Flags
VITE_DISABLE_EDIT_BUSSINESS_HOURS=false
VITE_DISABLE_EDIT_END_OF_DAY=false
VITE_DISABLE_EDIT_HOLIDAYS=false
VITE_DISABLE_EDIT_QUEUE=false
VITE_DISABLE_EDIT_THRESHOLD=false
VITE_DISABLE_EDIT_QUEUECONFIGURATION=false
VITE_CALLBACK_PAGINATION_SIZE=1000

# Cognito
VITE_USER_POOL_ID=
VITE_USER_POOL_CLIENT_ID=
VITE_COGNITO_DOMAIN=
VITE_REDIRECT_SIGNIN=
VITE_REDIRECT_SIGNOUT=
```

## Desarrollo

```bash
# Instalar dependencias
pnpm install

# Ejecutar en desarrollo
pnpm run dev

# Preview del build
pnpm run preview
```
