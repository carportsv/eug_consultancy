# 🔍 Verificar Formato de FIREBASE_PRIVATE_KEY

## Error Actual

```
InvalidCharacterError: Failed to decode base64
```

Este error indica que la clave privada no está en formato base64 válido.

## Cómo Verificar el Formato

### Paso 1: Ver el Secret Actual

1. Ve a **Supabase Dashboard > Edge Functions > Secrets**
2. Haz clic en `FIREBASE_PRIVATE_KEY`
3. Copia el valor completo

### Paso 2: Verificar el Formato

La clave privada debe tener este formato:

```
-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCUAawuCiHdnD+y
eFTg3gHqD3LTUT0YgIMe3hQB0ig95VG1J3AE67tFbtoA2bv5EWk4PsFLtERcuPqo
... (más líneas) ...
-----END PRIVATE KEY-----
```

**O en formato de una sola línea con `\n` literales:**

```
-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCUAawuCiHdnD+y\neFTg3gHqD3LTUT0YgIMe3hQB0ig95VG1J3AE67tFbtoA2bv5EWk4PsFLtERcuPqo\n... (más líneas) ...\n-----END PRIVATE KEY-----
```

### Paso 3: Verificar que NO Tiene Caracteres Inválidos

La clave privada debe contener SOLO:
- Letras: `A-Z`, `a-z`
- Números: `0-9`
- Caracteres especiales: `+`, `/`, `=`
- Headers: `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
- Saltos de línea: `\n` (literales o reales)

**NO debe contener:**
- Espacios extra
- Caracteres raros
- Saltos de línea dobles
- Tabs u otros caracteres de control

## Solución: Copiar Correctamente desde el JSON

1. Abre el archivo JSON del Service Account de Firebase
2. Busca el campo `"private_key"`
3. Copia el valor **EXACTO** como está en el JSON (incluyendo los `\n` literales)
4. Pega en Supabase Edge Functions Secrets

**Ejemplo del JSON:**
```json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCUAawuCiHdnD+y\n...\n-----END PRIVATE KEY-----\n"
}
```

**Copia exactamente el valor de `private_key` (sin las comillas) y pégalo en Supabase.**

## Si el Problema Persiste

Si después de verificar el formato aún hay errores:

1. **Regenera el Service Account JSON** en Firebase Console
2. **Copia el `private_key` nuevamente**
3. **Actualiza el secret** en Supabase
4. **Vuelve a desplegar** la Edge Function

## Prueba Rápida

Después de actualizar el secret:

1. Ejecuta `database/PRUEBA_SIMPLE.sql`
2. Ve a **Edge Functions > send-push-notification > Logs**
3. Debe aparecer un log exitoso (sin errores de base64)

