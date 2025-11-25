# 🔧 Configuración de Supabase con GitHub Pages

## ✅ **Sí, Supabase funciona perfectamente con GitHub Pages**

Supabase es una base de datos en la nube, por lo que funciona desde cualquier dominio. Solo necesitas configurar CORS.

## 🚀 **Pasos para configurar Supabase con GitHub Pages:**

### **1. Configurar CORS en Supabase Dashboard**

1. **Ve a tu proyecto de Supabase:**
   - https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Configura CORS:**
   - Settings > API
   - En "Additional Allowed Origins" agrega:
   ```
   https://tu-usuario.github.io
   https://tu-app.netlify.app
   https://tu-app.vercel.app
   ```

### **2. Configurar Firebase Authentication**

1. **Ve a Firebase Console:**
   - https://console.firebase.google.com
   - Selecciona tu proyecto

2. **Configurar dominios autorizados:**
   - Authentication > Settings > Authorized domains
   - Agrega tu dominio de GitHub Pages:
   ```
   tu-usuario.github.io
   ```

### **3. Actualizar config.js con tu dominio**

```javascript
// En web-html/js/config.js
AUTHORIZED_DOMAINS: [
    'localhost:8000',
    '127.0.0.1:8000',
    '{{FIREBASE_AUTH_DOMAIN}}',
    'tu-usuario.github.io',  // ← Agregar aquí tu dominio
],
```

### **4. Configurar reCAPTCHA (si lo usas)**

1. **Ve a Google reCAPTCHA:**
   - https://www.google.com/recaptcha/admin
   - Edita tu sitio

2. **Agregar dominios:**
   ```
   tu-usuario.github.io
   ```

## 🔍 **Verificar que todo funcione:**

### **Test 1: Conexión a Supabase**
```javascript
// En la consola del navegador
fetch('{{SUPABASE_URL}}/rest/v1/users?select=*', {
    headers: {
        'apikey': 'tu-supabase-anon-key',
        'Authorization': 'Bearer tu-supabase-anon-key'
    }
}).then(r => r.json()).then(console.log)
```

### **Test 2: Firebase Auth**
```javascript
// Verificar que Firebase esté configurado
firebase.auth().signInAnonymously()
    .then(() => console.log('✅ Firebase funciona'))
    .catch(e => console.error('❌ Error:', e))
```

## ⚠️ **Problemas comunes y soluciones:**

### **Error: "CORS policy"**
- ✅ Verificar que el dominio esté en CORS de Supabase
- ✅ Usar HTTPS (GitHub Pages ya lo tiene)

### **Error: "API_KEY_HTTP_REFERRER_BLOCKED"**
- ✅ Agregar dominio a Firebase Auth
- ✅ Verificar que sea HTTPS

### **Error: "reCAPTCHA not found"**
- ✅ Agregar dominio a reCAPTCHA
- ✅ Verificar clave del sitio

## 🎯 **Flujo completo de despliegue:**

1. **Crear repositorio en GitHub**
2. **Subir archivos de web-html**
3. **Activar GitHub Pages**
4. **Configurar CORS en Supabase**
5. **Configurar Firebase Auth**
6. **Configurar reCAPTCHA**
7. **¡Listo!** Tu app funcionará en `https://tu-usuario.github.io/tu-repositorio`

## 📱 **Ventajas de usar Supabase con GitHub Pages:**

- ✅ **Base de datos en la nube** - No necesitas servidor
- ✅ **Autenticación completa** - Firebase + Supabase
- ✅ **Tiempo real** - WebSockets automáticos
- ✅ **HTTPS automático** - GitHub Pages lo proporciona
- ✅ **Gratis** - Ambos servicios tienen planes gratuitos

## 🔗 **URLs importantes:**

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Firebase Console:** https://console.firebase.google.com
- **reCAPTCHA Admin:** https://www.google.com/recaptcha/admin
- **GitHub Pages:** https://pages.github.com

¿Necesitas ayuda con algún paso específico? 