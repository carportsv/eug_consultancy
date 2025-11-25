# 🚀 Guía de Despliegue - Cuzcatlansv.ride

## 🌐 Opciones de Hosting

### 1. **GitHub Pages (GRATIS)**
```bash
# 1. Crear repositorio en GitHub
# 2. Subir archivos de web-html
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/tu-repositorio.git
git push -u origin main

# 3. Activar GitHub Pages en Settings > Pages
# 4. Seleccionar branch main y carpeta / (root)
```

**URL resultante:** `https://tu-usuario.github.io/tu-repositorio`

### 2. **Netlify (GRATIS)**
```bash
# 1. Crear cuenta en netlify.com
# 2. Arrastrar carpeta web-html a Netlify
# 3. Configurar dominio personalizado (opcional)
```

**URL resultante:** `https://tu-app.netlify.app`

### 3. **Vercel (GRATIS)**
```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Desplegar desde web-html
cd web-html
vercel

# 3. Seguir instrucciones en terminal
```

**URL resultante:** `https://tu-app.vercel.app`

### 4. **Firebase Hosting (GRATIS)**
```bash
# 1. Instalar Firebase CLI
npm install -g firebase-tools

# 2. Inicializar Firebase
firebase login
firebase init hosting

# 3. Configurar:
# - Public directory: web-html
# - Single-page app: No
# - GitHub Actions: No

# 4. Desplegar
firebase deploy
```

**URL resultante:** `https://tu-proyecto.web.app`

## 🔧 Configuración Necesaria

### **Actualizar config.js para producción:**
```javascript
// web-html/js/config.js
const config = {
    // Cambiar URLs para producción
    apiUrl: 'https://tu-api-url.com',
    supabaseUrl: 'https://tu-supabase-url.supabase.co',
    supabaseKey: 'tu-supabase-anon-key',
    
    // Configurar reCAPTCHA para dominio de producción
    recaptchaSiteKey: 'tu-recaptcha-site-key'
};
```

### **Configurar CORS en Supabase:**
```sql
-- En Supabase Dashboard > Settings > API
-- Agregar tu dominio a "Additional Allowed Origins"
-- Ejemplo: https://tu-app.netlify.app
```

## 📁 Estructura para Despliegue

```
web-html/
├── index.html          # ✅ Página principal
├── css/               # ✅ Estilos
├── js/                # ✅ JavaScript
├── assets/            # ✅ Imágenes
└── README-HOSTING.md  # ✅ Esta guía
```

## 🚀 Pasos Rápidos para GitHub Pages

1. **Crear repositorio en GitHub**
2. **Subir archivos:**
   ```bash
   cd web-html
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/tu-usuario/tu-repositorio.git
   git push -u origin main
   ```
3. **Activar GitHub Pages:**
   - Settings > Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: / (root)
4. **Esperar 5 minutos**
5. **¡Listo!** Tu app estará en `https://tu-usuario.github.io/tu-repositorio`

## ⚠️ Consideraciones Importantes

### **Seguridad:**
- ✅ Usar HTTPS en producción
- ✅ Configurar CORS correctamente
- ✅ Proteger claves de API

### **Performance:**
- ✅ Comprimir imágenes
- ✅ Minificar CSS/JS
- ✅ Usar CDN para recursos externos

### **Dominio Personalizado:**
- ✅ Comprar dominio (GoDaddy, Namecheap)
- ✅ Configurar DNS
- ✅ Configurar SSL/HTTPS

## 🎯 Recomendación

**Para empezar rápido:** GitHub Pages
**Para más control:** Netlify o Vercel
**Para integración con Firebase:** Firebase Hosting

¿Cuál prefieres? Te ayudo con la configuración específica. 