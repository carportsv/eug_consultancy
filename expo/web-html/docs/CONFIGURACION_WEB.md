# Configuración de la Versión Web

## 📋 Descripción

La versión web de la aplicación utiliza un sistema de configuración que lee las variables de entorno desde el archivo `.env` de la raíz del proyecto.

## 🔧 Configuración Requerida

### 1. Archivo .env

Crea un archivo `.env` en la raíz del proyecto (al mismo nivel que `package.json`) con las siguientes variables:

```env
# ========================================
# SUPABASE CONFIGURATION
# ========================================
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui

# ========================================
# FIREBASE CONFIGURATION
# ========================================
EXPO_PUBLIC_FIREBASE_API_KEY=tu_firebase_api_key_aqui
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### 2. Generar Configuración

Después de crear el archivo `.env`, ejecuta el siguiente comando para generar la configuración de la web:

```bash
npm run web:config:generate
```

Este comando:
- Lee el archivo `.env` de la raíz del proyecto
- Genera el archivo `web-html/js/config.override.js` con las variables reales
- Habilita todas las opciones de autenticación

## 🚀 Uso

### Desarrollo Local

1. **Configurar variables de entorno:**
   ```bash
   # Copiar el template
   cp env.template .env
   
   # Editar con tus valores reales
   nano .env
   ```

2. **Generar configuración web:**
   ```bash
   npm run web:config:generate
   ```

3. **Iniciar servidor web:**
   ```bash
   npm run web:start
   ```

### Producción

1. **Configurar variables de entorno en el servidor**
2. **Generar configuración:**
   ```bash
   npm run web:config:generate
   ```
3. **Desplegar archivos de `web-html/`**

## 📁 Estructura de Archivos

```
zkt_openstreet/
├── .env                          # Variables de entorno (crear)
├── env.template                  # Template de variables
├── web-html/
│   ├── js/
│   │   ├── config.js            # Configuración base
│   │   └── config.override.js   # Configuración generada desde .env
│   └── scripts/
│       └── generate-config.js   # Generador de configuración
```

## 🔒 Seguridad

- **NUNCA** subas el archivo `.env` al repositorio
- **NUNCA** incluyas claves reales en el código
- El archivo `.env` está en `.gitignore` por defecto
- El archivo `config.override.js` se genera automáticamente

## 🐛 Solución de Problemas

### Error: "No se pudo cargar .env"

1. Verifica que el archivo `.env` existe en la raíz del proyecto
2. Verifica que las variables están correctamente formateadas
3. Ejecuta `npm run web:config:generate` para regenerar

### Error: "CONFIG no está disponible"

1. Verifica que `config.js` se carga antes que `config.override.js`
2. Verifica que no hay errores de JavaScript en la consola

### Error: "Autenticación por email no está habilitada"

1. Verifica que `ENABLE_EMAIL_AUTH: true` en la configuración
2. Ejecuta `npm run web:config:generate` para regenerar

## 📝 Notas Importantes

- Las variables de entorno deben empezar con `EXPO_PUBLIC_` para ser accesibles en el navegador
- El archivo `config.override.js` se regenera cada vez que ejecutas el comando
- Si no existe `.env`, se crea una configuración por defecto
- Los cambios en `.env` requieren regenerar la configuración

## 🔄 Flujo de Configuración

1. **Desarrollador** edita `.env` con claves reales
2. **Comando** `npm run web:config:generate` lee `.env`
3. **Script** genera `config.override.js` con variables reales
4. **Navegador** carga `config.js` → `config.override.js`
5. **Aplicación** usa configuración con claves reales
