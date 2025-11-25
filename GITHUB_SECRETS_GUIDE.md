# 🔐 Guía: Configurar GitHub Secrets para Variables de Entorno

## 📋 Variables Necesarias

Basándome en tu código, necesitas configurar estas variables en GitHub Secrets:

### Firebase:
1. `EXPO_PUBLIC_FIREBASE_API_KEY`
2. `EXPO_PUBLIC_FIREBASE_APP_ID`
3. `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
4. `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
5. `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
6. `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`

### Supabase:
7. `EXPO_PUBLIC_SUPABASE_URL`
8. `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 🚀 Pasos para Agregar Secrets en GitHub

### 1. **Ir a la Configuración de Secrets**

1. Ve a tu repositorio: `https://github.com/carportsv/fzkt_openstreet`
2. Click en **Settings** (Configuración)
3. En el menú lateral izquierdo, expande **Secrets and variables**
4. Click en **Actions**

### 2. **Agregar cada Secret**

Para cada variable del listado anterior:

1. Click en **"New repository secret"** (Nuevo secreto del repositorio)
2. **Name** (Nombre): Ingresa el nombre exacto de la variable (ej: `EXPO_PUBLIC_FIREBASE_API_KEY`)
3. **Secret** (Valor): Pega el valor desde tu archivo `.env`
4. Click en **"Add secret"** (Agregar secreto)

### 3. **Repetir para todas las variables**

Agrega las 8 variables una por una.

---

## 📝 Lista de Variables a Agregar

Copia y pega estos nombres en GitHub Secrets (los valores vienen de tu `.env`):

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

---

## ✅ Verificación

Una vez agregadas todas las variables, deberías ver 8 secrets en la lista de **Repository secrets**.

---

## 🔄 Actualizar el Workflow

El workflow ya está configurado para usar estos secrets. Se crearán automáticamente como variables de entorno durante el build.

---

## ⚠️ Importante

- **Nunca** subas tu archivo `.env` a GitHub (debe estar en `.gitignore`)
- Los secrets son **privados** y solo visibles durante la ejecución del workflow
- Si cambias algún valor, actualiza el secret correspondiente en GitHub

---

## 🐛 Si algo falla

1. Verifica que todos los secrets estén agregados
2. Revisa los logs del workflow en Actions
3. Asegúrate de que los nombres de los secrets coincidan exactamente con los del código

