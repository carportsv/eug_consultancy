import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

// Import other screens from their correct locations
import 'package:fzkt_openstreet/screens/admin/admin_home_screen.dart';
import 'package:fzkt_openstreet/screens/driver/driver_home_screen.dart';
import 'package:fzkt_openstreet/screens/user/user_home_screen.dart';

// Import local auth files
import './login_screen.dart';
import 'user_service.dart';

class RoutingScreen extends StatefulWidget {
  const RoutingScreen({super.key});

  @override
  State<RoutingScreen> createState() => _RoutingScreenState();
}

class _RoutingScreenState extends State<RoutingScreen> {
  // Instantiate the service directly. No Provider needed.
  final UserService _userService = UserService();

  @override
  void initState() {
    super.initState();
    _redirectUser();
  }

  Future<void> _redirectUser() async {
    // Pequeño delay para asegurar que el contexto esté listo
    await Future.delayed(const Duration(milliseconds: 100));

    if (!mounted) return;

    final user = FirebaseAuth.instance.currentUser;

    if (user == null) {
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const LoginScreen()),
          (route) => false,
        );
      }
      return;
    }

    // Navegar inmediatamente con rol por defecto, luego actualizar si es necesario
    Widget destination = const UserHomeScreen();

    // CRÍTICO: Sincronizar PRIMERO para asegurar que el usuario existe en Supabase
    // Esto es especialmente importante en web donde puede ser la primera vez
    try {
      debugPrint('[RoutingScreen] Sincronizando usuario con Supabase primero...');
      debugPrint('[RoutingScreen] UID del usuario: ${user.uid}, Email: ${user.email}');
      final syncResult = await _userService.syncUserWithSupabase();
      debugPrint('[RoutingScreen] Sincronización completada: $syncResult');
      // Esperar un poco para asegurar que la sincronización se complete en la BD
      await Future.delayed(const Duration(milliseconds: 500));
    } catch (e) {
      debugPrint('[RoutingScreen] Error en sincronización: $e. Continuando...');
    }

    // Intentar obtener el rol con múltiples intentos para evitar confusión
    String role = 'user'; // Valor por defecto
    int maxAttempts = 3;
    int attempt = 0;
    bool roleObtained = false;

    while (!roleObtained && attempt < maxAttempts) {
      attempt++;
      try {
        debugPrint(
          '[RoutingScreen] Intento $attempt/$maxAttempts: Obteniendo rol del usuario: ${user.uid}',
        );
        role = await _userService
            .getUserRole(user.uid)
            .timeout(
              const Duration(seconds: 5),
              onTimeout: () {
                debugPrint('[RoutingScreen] ⚠️ Timeout en intento $attempt/$maxAttempts');
                return 'user'; // Retornar 'user' en caso de timeout
              },
            );

        roleObtained = true;
        debugPrint('[RoutingScreen] ✅ User role obtenido en intento $attempt: $role');
        debugPrint('[RoutingScreen] 🔍 Verificando rol obtenido: $role para UID: ${user.uid}');

        // Si el rol es 'user' pero esperábamos 'admin', intentar una vez más después de un delay
        if (role == 'user' && attempt < maxAttempts) {
          debugPrint('[RoutingScreen] ⚠️ Rol es "user", esperando un poco más y reintentando...');
          await Future.delayed(const Duration(milliseconds: 1000));
          final retryRole = await _userService
              .getUserRole(user.uid)
              .timeout(const Duration(seconds: 5), onTimeout: () => 'user');
          if (retryRole != 'user') {
            debugPrint('[RoutingScreen] ✅ Rol corregido después de retry: $retryRole');
            role = retryRole;
          }
        }
      } catch (e) {
        debugPrint('[RoutingScreen] ❌ Error en intento $attempt/$maxAttempts: $e');
        if (attempt < maxAttempts) {
          // Esperar un poco antes de reintentar
          await Future.delayed(Duration(milliseconds: 500 * attempt));
        } else {
          // Si es el último intento y falló, usar 'user' por defecto
          debugPrint(
            '[RoutingScreen] ⚠️ No se pudo obtener el rol después de $maxAttempts intentos. Usando "user" por defecto.',
          );
          debugPrint('[RoutingScreen] ⚠️ UID del usuario: ${user.uid}, Email: ${user.email}');
        }
      }
    }

    if (!mounted) return;

    switch (role) {
      case 'admin':
        destination = const AdminHomeScreen();
        break;
      case 'driver':
        destination = const DriverHomeScreen();
        break;
      default:
        destination = const UserHomeScreen();
        break;
    }

    // Navegar inmediatamente
    if (mounted) {
      debugPrint('[RoutingScreen] 🚀 Navigating to destination...');
      Navigator.of(
        context,
      ).pushAndRemoveUntil(MaterialPageRoute(builder: (context) => destination), (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
