# Guía de Despliegue - Flutter Web

## 📋 Opción 1: GitHub Pages (Gratis)

### Pasos:

1. **Preparar el repositorio:**
   ```bash
   # Asegúrate de tener tu código en GitHub
   git add .
   git commit -m "Preparar para despliegue"
   git push origin main
   ```

2. **Habilitar GitHub Pages:**
   - Ve a tu repositorio en GitHub
   - Settings → Pages
   - Source: selecciona "GitHub Actions"
   - Guarda

3. **El workflow automático:**
   - El archivo `.github/workflows/deploy-web.yml` se ejecutará automáticamente
   - Cada push a `main` desplegará automáticamente
   - Tu app estará en: `https://tu-usuario.github.io/fzkt_openstreet/`

4. **Si tu repo tiene un nombre diferente:**
   - Edita `.github/workflows/deploy-web.yml`
   - Cambia `--base-href "/fzkt_openstreet/"` por `--base-href "/tu-nombre-repo/"`

### ⚠️ Importante para GitHub Pages:
- **Base href**: Debe coincidir con el nombre de tu repositorio
- **HTTPS**: GitHub Pages solo funciona con HTTPS
- **Variables de entorno**: No puedes usar archivos `.env` directamente, usa secrets de GitHub

---

## 🌐 Opción 2: Hosting Personalizado (cPanel, VPS, etc.)

### Método A: Subir archivos manualmente

1. **Compilar la app:**
   ```bash
   flutter build web --release
   ```

2. **Obtener los archivos:**
   - Los archivos estarán en: `build/web/`
   - Contiene: `index.html`, `main.dart.js`, `assets/`, etc.

3. **Subir al hosting:**
   - Conecta por FTP/SFTP a tu servidor
   - Sube TODO el contenido de `build/web/` a la carpeta pública (generalmente `public_html/` o `www/`)
   - Asegúrate de que `index.html` esté en la raíz

4. **Configurar el servidor:**
   - Asegúrate de que el servidor sirva `index.html` para todas las rutas (SPA)
   - Si usas Apache, crea/edita `.htaccess`:

### Método B: Usar Git en el servidor

1. **En tu servidor (SSH):**
   ```bash
   cd /var/www/html  # o tu carpeta pública
   git clone https://github.com/tu-usuario/fzkt_openstreet.git
   cd fzkt_openstreet
   flutter build web --release
   cp -r build/web/* /var/www/html/
   ```

---

## 🔧 Configuración del Servidor

### Para Apache (.htaccess):

Crea un archivo `.htaccess` en la raíz de tu sitio:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Habilitar compresión
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache para assets estáticos
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

### Para Nginx:

Edita tu configuración de Nginx:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🔐 Variables de Entorno

### Para GitHub Pages:
Usa GitHub Secrets:
- Settings → Secrets and variables → Actions
- Agrega tus variables como secrets
- Accede desde el workflow con `${{ secrets.NOMBRE_SECRET }}`

### Para Hosting Personalizado:
1. **Opción 1**: Inyectar en `index.html` (ya tienes un script para esto)
2. **Opción 2**: Usar variables de entorno del servidor
3. **Opción 3**: Crear un archivo `config.js` con las variables

---

## 📝 Checklist Pre-Despliegue

- [ ] Compilar en modo release: `flutter build web --release`
- [ ] Verificar que todas las rutas funcionen (SPA)
- [ ] Configurar variables de entorno
- [ ] Verificar que Firebase/Supabase funcionen en web
- [ ] Probar en diferentes navegadores
- [ ] Verificar HTTPS (obligatorio para algunas APIs)
- [ ] Configurar CORS si es necesario
- [ ] Optimizar imágenes y assets

---

## 🚀 Comandos Rápidos

```bash
# Compilar para web
flutter build web --release

# Compilar con base href personalizado
flutter build web --release --base-href "/mi-app/"

# Probar localmente antes de desplegar
flutter run -d chrome --release

# Verificar tamaño del build
du -sh build/web/
```

---

## 📞 Soporte

Si tienes problemas:
1. Verifica los logs del servidor
2. Revisa la consola del navegador (F12)
3. Asegúrate de que todas las rutas apunten a `index.html`
4. Verifica CORS en Firebase/Supabase

