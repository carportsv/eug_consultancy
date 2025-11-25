# 🗄️ Scripts de Base de Datos - Taxi ZKT

## 🎯 **Descripción General**

Esta carpeta contiene todos los scripts SQL necesarios para configurar, mantener y solucionar problemas en la base de datos de Supabase del proyecto Taxi ZKT.

---

## 📋 **Índice de Scripts SQL**

### **🏗️ Configuración Inicial**
- **[supabase-schema.sql](./supabase-schema.sql)** - Esquema completo de la base de datos
- **[ejecutar-schema.sql](./ejecutar-schema.sql)** - Script principal para crear todas las tablas

### **🔗 Tiempo Real (Realtime)**
- **[enable-realtime.sql](./enable-realtime.sql)** - Habilitar funcionalidad de tiempo real
- **[enable-realtime-fixed.sql](./enable-realtime-fixed.sql)** - Versión corregida del script de tiempo real

### **🔧 Correcciones y Fixes**
- **[fix-driver-status.sql](./fix-driver-status.sql)** - Corregir estado de conductores
- **[fix-email-constraint.sql](./fix-email-constraint.sql)** - Corregir restricciones de email
- **[fix-email-constraint-final.sql](./fix-email-constraint-final.sql)** - Versión final de corrección de email

### **📊 Tablas y Estructura**
- **[create-ride-requests-table.sql](./create-ride-requests-table.sql)** - Crear tabla de solicitudes de viaje

### **🔒 Seguridad**
- **[disable-rls.sql](./disable-rls.sql)** - Deshabilitar Row Level Security (solo para desarrollo)

---

## 📖 **Descripción Detallada de Cada Script**

### **🏗️ supabase-schema.sql**
**Propósito:** Esquema completo de la base de datos
**Contenido:**
- Creación de todas las tablas principales
- Configuración de tipos de datos
- Índices y restricciones
- Políticas de seguridad RLS

**Cuándo usar:**
- Configuración inicial del proyecto
- Migración completa de base de datos
- Referencia del esquema completo

### **🏗️ ejecutar-schema.sql**
**Propósito:** Script principal para ejecutar todo el esquema
**Contenido:**
- Ejecución secuencial de todas las tablas
- Configuración de políticas de seguridad
- Habilitación de RLS
- Configuración de triggers

**Cuándo usar:**
- Primera configuración de Supabase
- Después de crear un nuevo proyecto
- Reset completo de la base de datos

### **🔗 enable-realtime.sql**
**Propósito:** Habilitar funcionalidad de tiempo real
**Contenido:**
- Configuración de publicación de Realtime
- Adición de tablas a la publicación
- Configuración de triggers para cambios

**Cuándo usar:**
- Cuando el tiempo real no funciona
- Después de crear nuevas tablas
- Para habilitar actualizaciones en vivo

### **🔗 enable-realtime-fixed.sql**
**Propósito:** Versión corregida del script de tiempo real
**Contenido:**
- Correcciones específicas para problemas de Realtime
- Configuración optimizada
- Solución para errores comunes

**Cuándo usar:**
- Cuando el script original no funciona
- Para resolver problemas específicos de tiempo real
- Como alternativa al script principal

### **🔧 fix-driver-status.sql**
**Propósito:** Corregir estado de conductores
**Contenido:**
- Actualización de estados incorrectos
- Limpieza de datos inconsistentes
- Corrección de disponibilidad

**Cuándo usar:**
- Cuando los conductores aparecen con estado incorrecto
- Para limpiar datos inconsistentes
- Después de migraciones

### **🔧 fix-email-constraint.sql**
**Propósito:** Corregir restricciones de email
**Contenido:**
- Eliminación de restricciones problemáticas
- Recreación de restricciones correctas
- Limpieza de datos duplicados

**Cuándo usar:**
- Cuando hay errores de restricción de email
- Para resolver problemas de duplicados
- Después de cambios en la estructura de usuarios

### **🔧 fix-email-constraint-final.sql**
**Propósito:** Versión final de corrección de email
**Contenido:**
- Solución definitiva para problemas de email
- Configuración optimizada de restricciones
- Limpieza completa de datos

**Cuándo usar:**
- Cuando los scripts anteriores no resuelven el problema
- Para una solución definitiva
- En casos de problemas persistentes

### **📊 create-ride-requests-table.sql**
**Propósito:** Crear tabla de solicitudes de viaje
**Contenido:**
- Estructura de la tabla ride_requests
- Configuración de tipos de datos
- Índices para optimización

**Cuándo usar:**
- Cuando falta la tabla de solicitudes
- Para recrear la tabla específica
- En migraciones parciales

### **🔒 disable-rls.sql**
**Propósito:** Deshabilitar Row Level Security
**Contenido:**
- Deshabilitación temporal de RLS
- Configuración para desarrollo
- Acceso completo a datos

**Cuándo usar:**
- Solo en desarrollo
- Para debugging de problemas de permisos
- Para migraciones de datos

---

## 🚀 **Cómo Usar los Scripts**

### **📋 Orden de Ejecución Recomendado:**

#### **1. Configuración Inicial:**
```sql
-- 1. Ejecutar esquema completo
\i database/ejecutar-schema.sql

-- 2. Habilitar tiempo real
\i database/enable-realtime.sql
```

#### **2. Correcciones Específicas:**
```sql
-- Si hay problemas de email
\i database/fix-email-constraint-final.sql

-- Si hay problemas de conductores
\i database/fix-driver-status.sql

-- Si el tiempo real no funciona
\i database/enable-realtime-fixed.sql
```

### **🔧 Ejecución en Supabase:**

#### **Desde el Dashboard:**
1. Ir a **SQL Editor** en Supabase
2. Copiar el contenido del script
3. Ejecutar el script
4. Verificar los resultados

#### **Desde la Terminal:**
```bash
# Conectar a Supabase
psql "postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"

# Ejecutar script
\i database/ejecutar-schema.sql
```

---

## 🛠️ **Scripts de Automatización**

### **📁 Relacionados con Scripts:**
Los scripts de automatización en `/scripts/` utilizan estos archivos SQL:

- **`scripts/cleanup-old-data.sql`** - Limpieza automática de datos
- **`scripts/auto-cleanup.js`** - Ejecuta limpieza automática
- **`scripts/monitor-usage.js`** - Monitorea uso de base de datos

### **🔄 Integración:**
```javascript
// Ejemplo de uso en scripts
const { exec } = require('child_process');
exec('psql -f database/cleanup-old-data.sql', (error, stdout, stderr) => {
  if (error) {
    console.error('Error ejecutando SQL:', error);
    return;
  }
  console.log('SQL ejecutado exitosamente');
});
```

---

## 📊 **Estadísticas de Scripts**

### **📈 Uso por Categoría:**
- **Configuración:** 2 scripts
- **Tiempo Real:** 2 scripts
- **Correcciones:** 3 scripts
- **Estructura:** 1 script
- **Seguridad:** 1 script

### **📊 Tamaños:**
- **Total de scripts:** 9 archivos
- **Tamaño total:** ~25KB
- **Script más grande:** `ejecutar-schema.sql` (8.7KB)
- **Script más pequeño:** `disable-rls.sql` (718B)

---

## ⚠️ **Precauciones**

### **🔒 Seguridad:**
- **Nunca ejecutar** `disable-rls.sql` en producción
- **Hacer backup** antes de ejecutar scripts de corrección
- **Verificar permisos** antes de ejecutar scripts

### **🔄 Migración:**
- **Ejecutar en orden** recomendado
- **Verificar resultados** después de cada script
- **Hacer pruebas** en desarrollo antes de producción

### **📝 Logs:**
- **Revisar logs** después de ejecutar scripts
- **Documentar cambios** realizados
- **Mantener historial** de ejecuciones

---

## 🎯 **Casos de Uso Comunes**

### **🚀 Configuración Nueva:**
```sql
-- 1. Esquema completo
\i database/ejecutar-schema.sql

-- 2. Tiempo real
\i database/enable-realtime.sql
```

### **🔧 Problemas de Tiempo Real:**
```sql
-- Si el tiempo real no funciona
\i database/enable-realtime-fixed.sql
```

### **🐛 Problemas de Email:**
```sql
-- Si hay errores de restricción
\i database/fix-email-constraint-final.sql
```

### **🚗 Problemas de Conductores:**
```sql
-- Si los conductores no aparecen correctamente
\i database/fix-driver-status.sql
```

---

## 📚 **Documentación Relacionada**

### **📖 Guías:**
- **[Configuración de Supabase](../docs/SETUP_SUPABASE.md)**
- **[Diagnóstico de Tiempo Real](../docs/REALTIME_DIAGNOSIS.md)**
- **[Guía de Automatización](../docs/AUTOMATION_GUIDE.md)**

### **🔧 Scripts:**
- **[Scripts de Automatización](../scripts/)**
- **[Scripts de Prueba](../scripts/)**

---

**🗄️ Esta carpeta contiene todos los scripts necesarios para mantener la base de datos funcionando correctamente.** 