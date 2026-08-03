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

# Deploy utilizando la configuración existente de cognito

Para poder realizar las pruebas, necesitamos solamente los datos de amazon connect que estan en CERT y que los endpoints consulten a esos datos. No es necesario un deploy entero con una nueva configuración de Cognito/Cloudfront/Frontend.

Se puede deployar solamente las lambdas y API gateway (sin token de autorización) y reutilizar el frontend y cognito ya deployado, estos ya tienen la configuración con Azure de Evertec.

En este caso no esperamos a que terminen de configurar de su lado.

## Los pasos serían:

### Deployar Endpoints

Ya tenemos todo lo necesario para configurar las variables de entorno necesarias para crear los endpoints.

- Ejecutar el deployment del stack de endpoints (API Gateway + Lambdas)

### Build y Sync del Frontend

- Buildear el frontend (`pnpm build`)
- Sincronizar los archivos generados en el bucket de S3 creado en el paso 3 (CloudFront)
- Agregar los endpoints (La configuración de cognito es la misma)

**Azure del lado de Evertec tiene la siguiente configuración de Cognito:**
- **User PoolID:** `us-west-2_PYqrpEATu`
- **Identifier (Entity ID):** `urn:amazon:cognito:sp:us-west-2_PYqrpEATu`
- **Reply URL (ACS):** `https://callback-user-pool.auth.us-west-2.amazoncognito.com/saml2/idpresponse`
