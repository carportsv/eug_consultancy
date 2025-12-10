# 🚕 Eugenia's Travel Consultancy - Sistema de Reserva de Taxis

## 📋 Descripción General

**Eugenia's Travel Consultancy** es una aplicación Flutter multiplataforma (Android, iOS, Web) para la reserva y gestión de viajes en taxi. La aplicación permite a los usuarios solicitar viajes, a los conductores gestionar sus servicios, y a los administradores controlar todo el sistema.

### Información del Proyecto
- **Nombre**: fzkt_openstreet
- **Versión**: 1.0.0+1
- **Plataformas**: Android, iOS, Web
- **Estado**: ✅ Funcional y en producción

---

## 🎯 ¿Para qué sirve?

La aplicación está diseñada para:

1. **Usuarios/Clientes**: Reservar viajes en taxi de forma rápida y segura, con cálculo automático de precios y múltiples métodos de pago.

2. **Conductores**: Gestionar solicitudes de viajes, controlar disponibilidad, ver historial y recibir notificaciones en tiempo real.

3. **Administradores**: Gestionar reservas, conductores, clientes, precios y configuraciones del sistema.

---

## 🚀 Funciones Principales

### 1. **Sistema de Reserva de Viajes** 🗺️

**Ubicación**: `lib/screens/welcome/`

**¿Qué hace?**
- Permite a los usuarios ingresar origen y destino con autocompletado inteligente
- Calcula automáticamente la distancia y el precio del viaje
- Muestra un mapa interactivo con la ruta entre origen y destino
- Permite seleccionar tipo de vehículo, fecha, hora y número de pasajeros
- Genera solicitudes de viaje que se envían a los conductores disponibles

**Pantallas principales:**
- `welcome_screen.dart` - Pantalla inicial con formulario de reserva
- `request_ride_screen.dart` - Confirmación y detalles del viaje con mapa
- `receipt_screen.dart` - Recibo del viaje completado

---

### 2. **Panel del Conductor** 👨‍✈️

**Ubicación**: `lib/screens/driver/`

**¿Qué hace?**
- Muestra solicitudes de viajes pendientes en tiempo real
- Permite aceptar o rechazar solicitudes
- Controla la disponibilidad del conductor (activo/inactivo)
- Muestra el viaje activo en curso con detalles
- Historial completo de viajes realizados
- Configuración personal del conductor
- Recibe notificaciones push cuando hay nuevas solicitudes

**Pantallas:**
- `driver_home_screen.dart` - Panel principal con resumen y acciones rápidas
- `driver_requests_screen.dart` - Lista de solicitudes pendientes
- `driver_availability_screen.dart` - Control de disponibilidad
- `driver_ride_screen.dart` - Gestión del viaje activo
- `driver_history_screen.dart` - Historial de viajes
- `driver_settings_screen.dart` - Configuración personal

---

### 3. **Panel de Administración** 👨‍💼

**Ubicación**: `lib/screens/admin/`

**¿Qué hace?**
- Gestiona todas las reservas (pendientes, aceptadas, completadas, canceladas)
- Administra conductores (alta, baja, edición)
- Administra clientes
- Configura precios y tarifas del sistema
- Gestiona descuentos, vouchers y cargos especiales
- Control de pagos pendientes

**Módulos principales:**
- **Bookings**: Gestión completa de reservas
- **Drivers**: Administración de conductores
- **Customers**: Administración de clientes
- **Pricing**: Configuración de precios y tarifas

---

### 4. **Sistema de Pagos** 💳

**Ubicación**: `lib/services/paypal_service.dart`

**¿Qué hace?**
- Integración con PayPal para pagos en línea
- Genera códigos QR para escanear con móvil
- Procesa pagos con tarjeta de crédito
- Genera recibos PDF profesionales
- Maneja confirmaciones de pago

---

### 5. **Notificaciones Push** 🔔

**Ubicación**: `lib/services/push_notification_service.dart`

**¿Qué hace?**
- Envía notificaciones a conductores cuando hay nuevas solicitudes
- Funciona incluso cuando la app está en segundo plano
- Integración con Firebase Cloud Messaging (FCM)
- Notificaciones locales para alertas importantes

---

### 6. **Sistema de Mapas y Geocodificación** 🗺️

**Ubicación**: `lib/screens/welcome/form/`

**¿Qué hace?**
- Autocompletado inteligente de direcciones
- Geocodificación de direcciones a coordenadas
- Muestra mapas interactivos con OpenStreetMap
- Calcula rutas entre origen y destino
- Visualiza la ruta en el mapa

**Servicios:**
- `address_autocomplete_service.dart` - Autocompletado de direcciones
- `ride_calculation_service.dart` - Cálculo de distancias y precios

---

### 7. **Sistema de Autenticación** 🔐

**Ubicación**: `lib/auth/`

**¿Qué hace?**
- Autenticación con Firebase (Google Sign-In)
- Autenticación con Supabase
- Gestión de sesiones de usuario
- Control de acceso según rol (usuario, conductor, admin)

**Pantallas:**
- `login_screen.dart` - Inicio de sesión
- `web_login_screen.dart` - Login para web
- `routing_screen.dart` - Redirección según autenticación

---

### 8. **Sistema de Localización (Multiidioma)** 🌍

**Ubicación**: `lib/l10n/`

**¿Qué hace?**
- Soporta 4 idiomas: Español, Inglés, Italiano, Alemán
- Cambio dinámico de idioma sin reiniciar la app
- Traducciones completas de toda la interfaz
- Selector de idioma visible en todas las pantallas

**Archivos:**
- `es.json`, `en.json`, `it.json`, `de.json` - Archivos de traducción
- `app_localizations.dart` - Sistema de localización
- `locale_provider.dart` - Gestión de idioma actual

---

### 9. **Integración WhatsApp** 💬

**Ubicación**: `lib/shared/widgets/whatsapp_floating_button.dart`

**¿Qué hace?**
- Botón flotante de WhatsApp en todas las pantallas
- Abre WhatsApp con mensajes predefinidos según el contexto
- Soporte para WhatsApp Web y app móvil
- Mensajes personalizados para cada pantalla

---

### 10. **Generación de Recibos PDF** 📄

**Ubicación**: `lib/services/pdf_receipt_service.dart`

**¿Qué hace?**
- Genera recibos PDF profesionales
- Incluye todos los detalles del viaje
- Información del cliente y del pago
- Descarga e impresión de recibos

---

## 🏗️ Tecnologías Utilizadas

### Backend y Base de Datos
- **Supabase**: Base de datos PostgreSQL y autenticación
- **Firebase**: Autenticación y notificaciones push (FCM)
- **PostgreSQL**: Base de datos principal

### Mapas y Geocodificación
- **OpenStreetMap**: Mapas gratuitos
- **OSRM**: Cálculo de rutas
- **Geolocator**: Ubicación GPS

### Pagos
- **PayPal API**: Procesamiento de pagos

### UI/UX
- **Flutter Cupertino**: Diseño estilo iOS
- **Google Fonts**: Tipografías personalizadas
- **Provider**: Gestión de estado

### Otras
- **PDF**: Generación de documentos
- **QR Code**: Códigos QR para pagos
- **URL Launcher**: Apertura de WhatsApp y enlaces externos

---

## 📱 Estructura de Usuarios

### 1. **Usuario/Cliente**
- Puede reservar viajes
- Ver historial de viajes
- Realizar pagos
- Contactar por WhatsApp

### 2. **Conductor**
- Recibe solicitudes de viajes
- Acepta/rechaza solicitudes
- Gestiona disponibilidad
- Ve viaje activo
- Consulta historial

### 3. **Administrador**
- Gestiona todas las reservas
- Administra conductores y clientes
- Configura precios y tarifas
- Control total del sistema

---

## 🔄 Flujo Principal de un Viaje

1. **Cliente** ingresa origen y destino en la pantalla de bienvenida
2. El sistema **calcula distancia y precio** automáticamente
3. Cliente completa detalles y **confirma la reserva**
4. Se crea una **solicitud en la base de datos**
5. Los **conductores disponibles** reciben una **notificación push**
6. Un conductor **acepta la solicitud**
7. El cliente recibe confirmación
8. El conductor **completa el viaje**
9. Se genera el **recibo PDF** y se procesa el pago
10. El viaje queda registrado en el **historial**

---

## 📂 Estructura de Directorios Principales

```
lib/
├── auth/              # Autenticación (Firebase, Supabase)
├── l10n/              # Localización (4 idiomas)
├── router/            # Enrutamiento de la app
├── screens/            # Pantallas principales
│   ├── admin/         # Panel de administración
│   ├── driver/        # Panel del conductor
│   ├── user/          # Panel del usuario
│   └── welcome/       # Pantalla de bienvenida y reserva
├── services/          # Servicios (Supabase, PayPal, PDF, etc.)
├── shared/            # Widgets compartidos
└── widgets/           # Widgets reutilizables
```

---

## 🎨 Características de Diseño

- **Diseño Cupertino (iOS)**: Interfaz moderna estilo iOS en pantallas del conductor
- **Responsive**: Funciona en móviles, tablets y web
- **Multiidioma**: 4 idiomas soportados
- **Tema claro/oscuro**: Adaptación según preferencias del sistema
- **Navegación intuitiva**: Flujo de usuario optimizado

---

## 📝 Notas Importantes

- La aplicación requiere conexión a internet para funcionar
- Las notificaciones push solo funcionan en dispositivos móviles (no en web)
- Los pagos se procesan a través de PayPal (modo producción)
- El sistema de mapas utiliza OpenStreetMap (gratuito y sin límites)
- Todas las traducciones están completas en los 4 idiomas

---

## 🔧 Configuración Requerida

Para ejecutar la aplicación se necesita:
- Archivo `env` con las credenciales de Firebase, Supabase y PayPal
- Configuración de Firebase para Android/iOS
- Base de datos Supabase configurada con las tablas necesarias
- Cuenta de PayPal configurada

---

**Última actualización**: Enero 2025
**Versión del documento**: 1.0

