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
      await _userService.syncUserWithSupabase();
      debugPrint('[RoutingScreen] Sincronización completada');
    } catch (e) {
      debugPrint('[RoutingScreen] Error en sincronización: $e. Continuando...');
    }
    
    // Intentar obtener el rol con timeout más largo (5 segundos para web)
    try {
      debugPrint('[RoutingScreen] Obteniendo rol del usuario: ${user.uid}');
      final role = await _userService.getUserRole(user.uid)
          .timeout(const Duration(seconds: 5), onTimeout: () {
        debugPrint('[RoutingScreen] ⚠️ Timeout getting role, using default "user"');
        return 'user';
      });
      
      if (!mounted) return;

      debugPrint('[RoutingScreen] ✅ User role obtenido: $role');
      
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
    } catch (e) {
      debugPrint('[RoutingScreen] ❌ Error getting role: $e. Using default "user".');
      // Continuar con destino por defecto
    }

    // Navegar inmediatamente
    if (mounted) {
      debugPrint('[RoutingScreen] 🚀 Navigating to destination...');
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (context) => destination),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
