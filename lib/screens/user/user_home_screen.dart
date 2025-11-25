import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../auth/login_screen.dart';

class UserHomeScreen extends StatelessWidget {
  const UserHomeScreen({super.key});

  // Handle logout with proper error handling
  Future<void> _handleLogout(BuildContext context) async {
    try {
      debugPrint('[UserHomeScreen] Iniciando cierre de sesión...');

      // 1. Cerrar sesión de Firebase primero
      await FirebaseAuth.instance.signOut();
      debugPrint('[UserHomeScreen] ✅ Sesión de Firebase cerrada');

      // 2. Esperar un momento para que Firebase procese el logout
      await Future.delayed(const Duration(milliseconds: 500));

      // 3. Cerrar sesión de Google Sign-In también
      try {
        final GoogleSignIn googleSignIn = GoogleSignIn(scopes: ['email', 'profile']);
        await googleSignIn.signOut();
        debugPrint('[UserHomeScreen] ✅ Sesión de Google Sign-In cerrada');
      } catch (e) {
        debugPrint('[UserHomeScreen] ⚠️ Error al cerrar sesión de Google: $e');
        // Continuar aunque falle Google Sign-In
      }

      // 4. Esperar un momento adicional para asegurar que todo se limpie
      await Future.delayed(const Duration(milliseconds: 300));

      // 5. Navegar a LoginScreen y limpiar el stack de navegación
      if (context.mounted) {
        debugPrint('[UserHomeScreen] 🚀 Navegando a LoginScreen...');
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const LoginScreen()),
          (route) => false,
        );
      }
    } catch (e) {
      // Show error message if logout fails
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al cerrar sesión: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home (Usuario)'),
        backgroundColor: Colors.blue[700],
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar Sesión',
            onPressed: () => _handleLogout(context),
          ),
        ],
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.person, size: 80, color: Colors.blueGrey),
            SizedBox(height: 20),
            Text(
              'Bienvenido, Usuario!',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
