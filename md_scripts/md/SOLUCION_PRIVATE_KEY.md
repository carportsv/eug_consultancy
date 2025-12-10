# 🔧 Solución Definitiva: FIREBASE_PRIVATE_KEY

## Problema Actual

El error indica que `FIREBASE_PRIVATE_KEY` contiene caracteres inválidos que no son base64 válidos.

## Solución Paso a Paso

### Paso 1: Obtener la Clave Privada Correcta

1. Ve a **Firebase Console** > **Project Settings** > **Service Accounts**
2. Haz clic en **"Generate new private key"** (o usa el JSON existente)
3. Se descargará un archivo JSON

### Paso 2: Extraer el private_key del JSON

Abre el archivo JSON y busca el campo `"private_key"`. Debe verse así:

```json
{
  "type": "service_account",
  "project_id": "consultancy-ee352",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCUAawuCiHdnD+y\neFTg3gHqD3LTUT0YgIMe3hQB0ig95VG1J3AE67tFbtoA2bv5EWk4PsFLtERcuPqo\n... (más líneas) ...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  ...
}
```

### Paso 3: Copiar el Valor Exacto

**IMPORTANTE:** Copia el valor de `"private_key"` EXACTAMENTE como está, incluyendo:
- Los `\n` literales (NO los reemplaces)
- Las líneas `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
- Todo el contenido entre ellas

### Paso 4: Pegar en Supabase

1. Ve a **Supabase Dashboard > Edge Functions > Secrets**
2. Haz clic en `FIREBASE_PRIVATE_KEY` (o créalo si no existe)
3. Pega el valor que copiaste del JSON
4. **NO modifiques nada**, pégalo tal cual
5. Haz clic en **"Save"** o **"Update"**

### Paso 5: Verificar el Formato

Después de pegar, el secret debe verse así (en una sola línea o con saltos de línea):

```
-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCUAawuCiHdnD+y\neFTg3gHqD3LTUT0YgIMe3hQB0ig95VG1J3AE67tFbtoA2bv5EWk4PsFLtERcuPqo\n... (más líneas) ...\n-----END PRIVATE KEY-----
```

**O así (con saltos de línea reales):**

```
-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCUAawuCiHdnD+y
eFTg3gHqD3LTUT0YgIMe3hQB0ig95VG1J3AE67tFbtoA2bv5EWk4PsFLtERcuPqo
... (más líneas) ...
-----END PRIVATE KEY-----
```

### Paso 6: Actualizar la Edge Function

1. Ve a **Supabase Dashboard > Edge Functions > send-push-notification**
2. Haz clic en **"Code"**
3. Copia el contenido de `database/edge-function-index.ts` (ya actualizado)
4. Pega el código
5. Haz clic en **"Deploy"**

### Paso 7: Probar

1. Ejecuta `database/PRUEBA_SIMPLE.sql`
2. Ve a **Edge Functions > send-push-notification > Logs**
3. Debe aparecer un log exitoso (sin errores)

## Si el Problema Persiste

Si después de seguir estos pasos aún hay errores:

1. **Regenera el Service Account JSON** en Firebase Console
2. **Copia el `private_key` nuevamente** (puede haber cambiado)
3. **Actualiza el secret** en Supabase
4. **Vuelve a desplegar** la Edge Function

## Nota Importante

⚠️ **NUNCA** compartas el JSON del Service Account ni el `private_key` públicamente. Estos valores dan acceso completo a tu proyecto de Firebase.

