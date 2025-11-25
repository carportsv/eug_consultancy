# 🚀 Guía de Despliegue - Flutter Web a GitHub Pages

## ✅ Configuración Actual

Tu repositorio está configurado para desplegarse automáticamente en GitHub Pages.

**URL de tu app:** `https://carportsv.github.io/fzkt_openstreet/`

## 📋 Pasos para Activar

### 1. **Habilitar GitHub Pages (si aún no lo has hecho)**

1. Ve a tu repositorio: `https://github.com/carportsv/fzkt_openstreet`
2. Settings → Pages
3. En "Build and deployment":
   - **Source:** Selecciona "GitHub Actions" ✅
4. Guarda los cambios

### 2. **Hacer un Push para Activar el Workflow**

El workflow se ejecutará automáticamente cuando hagas push a la rama `main`:

```bash
git add .
git commit -m "Configurar despliegue automático"
git push origin main
```

### 3. **Verificar el Despliegue**

1. Ve a la pestaña **Actions** en tu repositorio
2. Verás el workflow "Deploy Flutter Web to GitHub Pages" ejecutándose
3. Espera a que termine (tarda ~3-5 minutos)
4. Una vez completado, tu app estará disponible en:
   - `https://carportsv.github.io/fzkt_openstreet/`

## 🔧 Configuración del Workflow

El workflow (`.github/workflows/deploy-web.yml`) está configurado para:

- ✅ Compilar Flutter Web automáticamente
- ✅ Usar el base-href correcto: `/fzkt_openstreet/`
- ✅ Desplegar a GitHub Pages automáticamente
- ✅ Ejecutarse en cada push a `main`
- ✅ También se puede ejecutar manualmente desde Actions

## ⚠️ Importante

### Variables de Entorno

Si tu app usa variables de entorno (`.env`), necesitas:

1. **Opción 1: GitHub Secrets** (Recomendado)
   - Settings → Secrets and variables → Actions
   - Agrega tus variables como secrets
   - Accede desde el código con `${{ secrets.NOMBRE_VARIABLE }}`

2. **Opción 2: Inyectar en index.html**
   - Modifica `web/index.html` para incluir las variables
   - O crea un `config.js` con las variables

### CORS y Firebase/Supabase

Asegúrate de agregar tu dominio de GitHub Pages a:
- **Firebase:** Console → Authentication → Settings → Authorized domains
- **Supabase:** Dashboard → Settings → API → Additional Allowed Origins

Agrega: `https://carportsv.github.io`

## 🐛 Solución de Problemas

### El workflow falla:
1. Revisa los logs en Actions
2. Verifica que Flutter esté instalado correctamente
3. Asegúrate de que `pubspec.yaml` esté correcto

### La app no carga:
1. Verifica que el base-href sea correcto
2. Revisa la consola del navegador (F12)
3. Asegúrate de que todas las rutas apunten a `index.html`

### Variables de entorno no funcionan:
1. Usa GitHub Secrets en lugar de archivos `.env`
2. O inyecta las variables directamente en `index.html`

## 📝 Notas

- El despliegue es automático en cada push a `main`
- Puedes ejecutar el workflow manualmente desde Actions → "Deploy Flutter Web to GitHub Pages" → "Run workflow"
- Los cambios pueden tardar 1-2 minutos en aparecer después del despliegue

## 🔗 Enlaces Útiles

- [Tu repositorio](https://github.com/carportsv/fzkt_openstreet)
- [GitHub Pages](https://carportsv.github.io/fzkt_openstreet/)
- [Actions](https://github.com/carportsv/fzkt_openstreet/actions)

