# Configuración de FCM API v1 (Nueva API)

## ⚠️ Importante

La API legacy de FCM está deshabilitada en tu proyecto. Debes usar la nueva API v1 que requiere OAuth 2.0.

## Pasos para Configurar

### 1. Obtener Credenciales de Firebase Service Account

1. Ve a **Firebase Console** > Tu proyecto > **Project Settings** > **Service Accounts**
2. Haz clic en **"Generate new private key"**
3. Descarga el archivo JSON (guárdalo de forma segura, no lo subas a git)

### 2. Extraer Valores del JSON

Del archivo JSON descargado, necesitas estos valores:

```json
{
  "project_id": "tu-project-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com"
}
```

### 3. Configurar Secrets en Supabase

Ve a **Supabase Dashboard > Project Settings > Edge Functions > Secrets** y agrega:

1. **FIREBASE_PROJECT_ID**
   - **Name:** `FIREBASE_PROJECT_ID`
   - **Value:** El `project_id` del JSON

2. **FIREBASE_PRIVATE_KEY**
   - **Name:** `FIREBASE_PRIVATE_KEY`
   - **Value:** El `private_key` del JSON (incluye los `\n`)

3. **FIREBASE_CLIENT_EMAIL**
   - **Name:** `FIREBASE_CLIENT_EMAIL`
   - **Value:** El `client_email` del JSON

### 4. Actualizar la Edge Function

La Edge Function ya está actualizada para usar la API v1. Solo necesitas:

1. Copiar el código de `database/edge-function-index.ts`
2. Pegarlo en tu Edge Function en Supabase Dashboard
3. Hacer clic en **"Deploy function"**

### 5. Verificar

Después de desplegar, prueba insertando un mensaje de prueba desde SQL Editor.

## Alternativa: Habilitar API Legacy (Más Simple)

Si prefieres usar la API legacy (más simple):

1. Ve a **Firebase Console** > **Project Settings** > **Cloud Messaging**
2. En la sección **"API de Cloud Messaging (heredada)"**, haz clic en los tres puntos (⋮)
3. Selecciona **"Habilitar"** o **"Enable"**
4. Copia el **"Server key"** que aparecerá
5. Usa el código original de la Edge Function (con `FCM_SERVER_KEY`)

## Comparación

| Característica | API Legacy | API v1 |
|----------------|------------|--------|
| Configuración | Más simple (solo Server Key) | Más compleja (OAuth 2.0) |
| Seguridad | Menos segura | Más segura |
| Estado | Deprecada (hasta 20/6/2024) | Actual y recomendada |
| Soporte | Limitado | Completo |

## Recomendación

- **Para desarrollo rápido:** Usa API Legacy (si puedes habilitarla)
- **Para producción:** Usa API v1 (más segura y actual)

