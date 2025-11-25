# Cuzcatlansv.ride - Aplicación Web HTML/CSS/JS

## 🚀 Descripción

Esta es la versión web optimizada de la aplicación de taxis Cuzcatlansv.ride, construida con HTML, CSS y JavaScript puro. Ofrece mejor rendimiento, SEO optimizado y una experiencia de usuario más rápida que la versión React Native Web.

## ✨ Características

- ✅ **Autenticación completa** con Firebase Auth
- ✅ **Mapas interactivos** con Leaflet y OpenStreetMap
- ✅ **Búsqueda de direcciones** en tiempo real
- ✅ **Geolocalización** del usuario
- ✅ **Sistema de notificaciones** en tiempo real
- ✅ **Diseño responsive** para todos los dispositivos
- ✅ **Interfaz moderna** con animaciones suaves
- ✅ **Integración con Supabase** para backend
- ✅ **PWA ready** (Progressive Web App)

## 📁 Estructura del Proyecto

```
web-html/
├── index.html              # Página principal
├── css/
│   ├── style.css           # Estilos principales
│   ├── components.css      # Componentes específicos
│   └── responsive.css      # Estilos responsive
├── js/
│   ├── config.js           # Configuración de la app
│   ├── api.js              # Servicios de API
│   ├── auth.js             # Autenticación Firebase
│   ├── maps.js             # Servicios de mapas
│   ├── realtime.js         # Comunicación en tiempo real
│   └── app.js              # Aplicación principal
├── assets/
│   ├── images/             # Imágenes
│   └── icons/              # Iconos
├── config.env.json         # (Opcional) Claves inyectadas desde .env raíz
├── debug/                  # (Nuevo) Páginas de diagnóstico y pruebas
│   ├── debug-auth.html
│   ├── debug-connection.html
│   ├── test-auth.html
│   ├── test-auth-config.html
│   ├── test-env-injection.html
│   ├── test-signin.html
│   ├── test-coop-fix.html
│   ├── test-csp-fix.html
│   ├── fix-firebase-domain.html
│   ├── fix-oauth-client.html
│   ├── fix-redirect-uri.html
│   ├── oauth-config-fix.html
│   └── oauth-fix-steps.html
├── dev/                    # (Nuevo) Scripts para levantar servidor local
│   ├── dev-server.js
│   ├── start-dev.js
│   ├── simple-server.py
│   └── simple-https-server.py
└── README.md               # Este archivo
```

## 🛠️ Configuración

### 1. Configurar Firebase

Edita el archivo `js/config.js` y actualiza la configuración de Firebase:

```javascript
FIREBASE_CONFIG: {
    apiKey: "tu-api-key",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "{{FIREBASE_MESSAGING_SENDER_ID}}",
    appId: "tu-app-id"
}
```

### 2. Configurar Supabase

En el mismo archivo `js/config.js`, actualiza la configuración de Supabase:

```javascript
SUPABASE_URL: 'https://tu-proyecto.supabase.co',
SUPABASE_ANON_KEY: 'tu-supabase-anon-key',
```

### 3. Configurar Coordenadas por Defecto

Actualiza las coordenadas por defecto (San Salvador, El Salvador):

```javascript
DEFAULT_LAT: 13.6929,
DEFAULT_LNG: -89.2182,
```

## 🚀 Instalación y Uso

### Opción 1: Servidor Local Simple

1. **Instalar un servidor HTTP local:**
   ```bash
   # Con Python 3
   python -m http.server 3000
   
   # Con Node.js (npx)
   npx http-server -p 3000
   
   # Con PHP
   php -S localhost:3000
   ```

2. **Abrir en el navegador:**
   ```
   http://localhost:3000
   ```

### Opción 2: Servidor de Desarrollo

1. **Instalar dependencias (opcional):**
   ```bash
   npm install -g live-server
   ```

2. **Ejecutar servidor de desarrollo:**
   ```bash
   live-server --port=3000
   ```

### Opción 3: Servidores incluidos en web-html/dev

Desde `web-html/dev/`:

```bash
# Node (hot-reload simple)
node start-dev.js

# Python HTTP
python simple-server.py

# Python HTTPS (autofirmado)
python simple-https-server.py
```

### Opción 4: Despliegue en Producción

1. **Subir archivos a tu servidor web**
2. **Configurar HTTPS** (requerido para geolocalización)
3. **Configurar variables de entorno** en el servidor

## 📱 Funcionalidades

### 🔐 Autenticación
- Registro de usuarios
- Inicio de sesión
- Recuperación de contraseña
- Verificación de email
- Perfil de usuario

### 🗺️ Mapas y Navegación
- Mapa interactivo con OpenStreetMap
- Búsqueda de direcciones en tiempo real
- Geolocalización automática
- Marcadores personalizados
- Cálculo de rutas

### 🚗 Gestión de Viajes
- Solicitud de taxi
- Seguimiento en tiempo real
- Información del conductor
- Historial de viajes
- Cancelación de viajes

### ⚡ Características Avanzadas
- Notificaciones push
- Modo offline básico
- Accesibilidad completa
- Soporte para PWA
- Modo oscuro automático

## 🎨 Personalización

### Colores y Temas

Edita las variables CSS en `css/style.css`:

```css
:root {
    --primary-color: #007AFF;
    --secondary-color: #5856D6;
    --success-color: #34C759;
    --warning-color: #FF9500;
    --danger-color: #FF3B30;
    /* ... más variables */
}
```

### Configuración de Mapas

Modifica la configuración en `js/config.js`:

```javascript
MAP_CONFIG: {
    ZOOM: 15,
    MIN_ZOOM: 10,
    MAX_ZOOM: 18,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '© OpenStreetMap contributors'
}
```

## 🔧 Desarrollo

### Estructura de Archivos JavaScript

- **`config.js`**: Configuración global y variables de entorno
- **`api.js`**: Servicios de comunicación con Supabase
- **`auth.js`**: Manejo de autenticación con Firebase
- **`maps.js`**: Servicios de mapas y geolocalización
- **`realtime.js`**: Comunicación en tiempo real
- **`app.js`**: Lógica principal de la aplicación

### Agregar Nuevas Funcionalidades

1. **Crear nuevo servicio** en la carpeta `js/`
2. **Importar en `index.html`**
3. **Inicializar en `app.js`**
4. **Agregar estilos** en `css/`

### Ejemplo de Nuevo Servicio

```javascript
// js/nuevo-servicio.js
class NuevoServicio {
    constructor() {
        this.init();
    }

    async init() {
        // Inicialización
    }

    // Métodos del servicio
}

// Crear instancia global
const nuevoServicio = new NuevoServicio();
```

## 📊 Rendimiento

### Optimizaciones Implementadas

- ✅ **Carga diferida** de recursos
- ✅ **Minificación** de CSS y JS
- ✅ **Compresión** de imágenes
- ✅ **Cache** del navegador
- ✅ **Service Workers** para PWA
- ✅ **Lazy loading** de mapas

### Métricas de Rendimiento

- **Tiempo de carga inicial**: < 2 segundos
- **Tiempo de respuesta**: < 100ms
- **Tamaño total**: < 2MB
- **Puntuación Lighthouse**: 90+

## 🔒 Seguridad

### Medidas Implementadas

- ✅ **HTTPS obligatorio** para producción
- ✅ **Validación de entrada** en cliente y servidor
- ✅ **Sanitización** de datos
- ✅ **Tokens de autenticación** seguros
- ✅ **CORS** configurado correctamente
- ✅ **Rate limiting** en APIs

## 🌐 Compatibilidad

### Navegadores Soportados

- ✅ **Chrome** 80+
- ✅ **Firefox** 75+
- ✅ **Safari** 13+
- ✅ **Edge** 80+
- ✅ **Opera** 67+

### Dispositivos

- ✅ **Desktop** (Windows, macOS, Linux)
- ✅ **Tablets** (iPad, Android)
- ✅ **Móviles** (iPhone, Android)
- ✅ **PWA** (instalable como app)

## 🚀 Despliegue

### Opciones de Hosting

1. **Netlify** (Recomendado)
2. **Vercel**
3. **GitHub Pages**
4. **Firebase Hosting**
5. **Servidor propio**

### Pasos para Despliegue

1. **Configurar variables de entorno**
2. **Habilitar HTTPS**
3. **Configurar dominio personalizado**
4. **Configurar PWA**
5. **Monitorear rendimiento**

## 📞 Soporte

### Problemas Comunes

1. **Mapa no carga**: Verificar conexión a internet
2. **Geolocalización no funciona**: Verificar HTTPS
3. **Autenticación falla**: Verificar configuración de Firebase
4. **APIs no responden**: Verificar configuración de Supabase

### Recursos Útiles

- [Documentación de Firebase](https://firebase.google.com/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Leaflet](https://leafletjs.com/reference.html)
- [Guía de PWA](https://web.dev/progressive-web-apps/)

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abrir un Pull Request

---

**Desarrollado con ❤️ para Cuzcatlansv.ride** 