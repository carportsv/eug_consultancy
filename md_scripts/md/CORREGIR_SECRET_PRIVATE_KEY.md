# 🔧 Corregir FIREBASE_PRIVATE_KEY en Supabase

## Problema

El error `DOMExceptionDataError: unknown/unsupported ASN.1 DER tag: 0x2d` indica que la clave privada está mal formateada en los secrets de Supabase.

## Solución

### Opción 1: Copiar desde el JSON directamente (Recomendado)

1. Abre el archivo JSON del Service Account de Firebase
2. Busca el campo `private_key`
3. Copia el valor **COMPLETO**, incluyendo:
   - `-----BEGIN PRIVATE KEY-----`
   - Todo el contenido en el medio
   - `-----END PRIVATE KEY-----`
4. **IMPORTANTE:** Copia exactamente como está, sin modificar nada

### Opción 2: Formato correcto en Supabase

Cuando pegues en Supabase Edge Functions Secrets:

1. Ve a **Supabase Dashboard > Edge Functions > Secrets**
2. Edita o crea el secret `FIREBASE_PRIVATE_KEY`
3. Pega el valor en este formato:

```
-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCUAawuCiHdnD+y\n... (resto de la clave) ...\n-----END PRIVATE KEY-----
```

**⚠️ IMPORTANTE:**
- Mantén los `\n` literales (no los reemplaces por saltos de línea reales)
- O si Supabase los convierte automáticamente, está bien
- La clave debe empezar con `-----BEGIN PRIVATE KEY-----`
- La clave debe terminar con `-----END PRIVATE KEY-----`

### Opción 3: Verificar el formato actual

1. Ve a **Supabase Dashboard > Edge Functions > Secrets**
2. Haz clic en `FIREBASE_PRIVATE_KEY`
3. Verifica que:
   - Empiece con `-----BEGIN PRIVATE KEY-----`
   - Termine con `-----END PRIVATE KEY-----`
   - No tenga espacios extra al inicio o final
   - No tenga caracteres raros

## Después de corregir

1. **Guarda** el secret actualizado
2. **Espera** unos segundos para que se actualice
3. **Prueba** nuevamente insertando un mensaje de prueba
4. **Verifica** los logs de la Edge Function - el error debe desaparecer

## Si el problema persiste

Si después de corregir el formato aún hay errores:

1. Regenera el Service Account JSON en Firebase Console
2. Copia el `private_key` nuevamente
3. Actualiza el secret en Supabase

