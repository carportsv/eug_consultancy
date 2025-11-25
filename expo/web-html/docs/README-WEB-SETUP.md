# 🌐 Configuración de la Versión Web

## 📋 Descripción

La versión web de la aplicación de taxi utiliza las mismas variables de entorno que la versión móvil, pero necesita que se genere un archivo de configuración específico (`config.env.json`) para funcionar correctamente.

## 🔧 Configuración Automática

### Opción 1: Script NPM (Recomendado)

```bash
# Generar configuración web desde .env
npm run web:config

# Iniciar servidor web con configuración automática
npm run web:start
```

### Opción 2: Scripts Manuales

```bash
# Generar configuración
node scripts/generate-web-config.js

# Iniciar servidor web
cd web-html
python start-server-with-config.py
```

## 📁 Archivos Generados

- `web-html/config.env.json` - Configuración con claves reales de Firebase y Supabase
- `web-html/localhost.crt` - Certificado SSL autofirmado
- `web-html/localhost.key` - Clave privada SSL

## 🔑 Variables Requeridas

El script verifica que las siguientes variables estén en tu archivo `.env`:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 🚀 Iniciar Servidor

1. **Generar configuración:**
   ```bash
   npm run web:config
   ```

2. **Iniciar servidor:**
   ```bash
   npm run web:start
   ```

3. **Acceder a la aplicación:**
   - URL: `https://localhost:8443`
   - El navegador mostrará una advertencia de seguridad (normal para certificados autofirmados)
   - Haz clic en "Avanzado" → "Continuar"

## 🔄 Actualizar Configuración

Si cambias las variables en el archivo `.env`, ejecuta:

```bash
npm run web:config
```

## 🛠️ Solución de Problemas

### Error: "API key not valid"
- Ejecuta `npm run web:config` para regenerar la configuración
- Verifica que las variables en `.env` sean correctas

### Error: "Faltan variables de entorno"
- Asegúrate de que el archivo `.env` esté en la raíz del proyecto
- Verifica que todas las variables requeridas estén definidas

### Error: "Certificado SSL"
- El script genera automáticamente certificados SSL autofirmados
- Si hay problemas, elimina `localhost.crt` y `localhost.key` y reinicia

## 📝 Notas Importantes

- La versión web usa las mismas claves de Firebase y Supabase que la versión móvil
- El servidor HTTPS es necesario para que reCAPTCHA funcione correctamente
- Los certificados SSL son autofirmados y solo para desarrollo
- La configuración se genera automáticamente desde el archivo `.env` de la raíz

## 🔒 Seguridad

- Nunca subas el archivo `config.env.json` a Git (ya está en `.gitignore`)
- Los certificados SSL son solo para desarrollo local
- En producción, usa certificados SSL válidos
