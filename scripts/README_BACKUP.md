# Guía de Backup Local del Proyecto

## 📦 Cómo hacer un backup

### Opción 1: Script PowerShell (Recomendado)
```powershell
.\scripts\backup-project.ps1
```

Este script:
- Crea un backup en `%USERPROFILE%\Documents\Backups\fzkt_openstreet\`
- Excluye archivos innecesarios (build, .dart_tool, etc.)
- Opcionalmente comprime el backup en un .zip
- Crea un archivo con información del backup

### Opción 2: Script Batch (Windows)
```cmd
scripts\backup-project.bat
```

### Opción 3: Copia Manual
1. Copia toda la carpeta del proyecto a otra ubicación
2. Excluye manualmente:
   - `build/`
   - `.dart_tool/`
   - `android/build/`
   - `android/app/build/`
   - `ios/Pods/`
   - Archivos `.log` y `.iml`

## 📍 Ubicación de los Backups

Los backups se guardan en:
```
D:\carposv\apps\taxi\backups\
```

Cada backup tiene un nombre con fecha y hora:
```
backup_2024-01-15_14-30-45\
```

## 🔄 Restaurar un Backup

1. Copia todos los archivos del backup a la ubicación del proyecto
2. Abre una terminal en la carpeta del proyecto
3. Ejecuta:
   ```bash
   flutter pub get
   flutter clean
   flutter pub get
   ```

## ⚠️ Importante

- **NO incluye el archivo `.env`** (está en .gitignore por seguridad)
- Guarda tu archivo `.env` por separado si es necesario
- Los backups NO incluyen archivos de compilación para ahorrar espacio

## 💡 Recomendaciones

1. **Haz backups antes de cambios importantes**
2. **Haz backups regulares** (semanal o mensual)
3. **Guarda backups en ubicaciones externas** (USB, disco externo, cloud)
4. **Mantén múltiples versiones** de backups importantes

## 📝 Notas

- Los scripts excluyen automáticamente archivos innecesarios
- Puedes modificar `scripts/backup-exclude.txt` para agregar más exclusiones
- El script PowerShell es más completo y permite comprimir el backup

