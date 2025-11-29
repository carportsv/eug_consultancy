import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class DriverHomeScreen extends StatelessWidget {
  const DriverHomeScreen({super.key});

  // Correctly handle logout using Firebase Auth
  void _handleLogout(BuildContext context) async {
    await FirebaseAuth.instance.signOut();
    // The AuthGate, listening to authStateChanges, will handle navigation.
  }

  @override
  Widget build(BuildContext context) {
    // Calcular la posición del logo para alinearlo con el botón del usuario en el AppBar
    final appBarHeight = kToolbarHeight; // Altura estándar del AppBar (56.0)
    final safeAreaTop = MediaQuery.of(context).padding.top;
    // Ajustar la posición: centrar el logo con el AppBar pero bajar un poco más (agregar 25px)
    final logoTopPosition =
        safeAreaTop +
        (appBarHeight / 2) -
        (225 / 2) +
        25.0; // Centrar verticalmente el logo (225 es el tamaño del logo) y bajar 25px

    // Envolver el Scaffold en un Stack para que el logo quede fuera del área de scroll
    // El Stack debe cubrir toda la pantalla para que el logo esté completamente fijo
    // El logo está al mismo nivel que el Scaffold, completamente independiente
    return Stack(
      clipBehavior: Clip.none,
      fit: StackFit.expand, // Asegurar que el Stack cubra toda la pantalla
      children: [
        // Scaffold directamente en el Stack (sin Positioned.fill)
        Scaffold(
          appBar: AppBar(
            title: const Text('Panel del Conductor'),
            backgroundColor: Colors.teal[700],
            actions: [
              IconButton(
                icon: const Icon(Icons.logout),
                tooltip: 'Cerrar Sesión',
                onPressed: () => _handleLogout(context),
              ),
            ],
          ),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.local_taxi, size: 80, color: Colors.blueGrey),
                SizedBox(height: 20),
                Text(
                  'Bienvenido, Conductor!',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ),
        // Logo fijo que NO se mueve con el scroll - completamente independiente del Scaffold
        // Alineado con el botón del usuario en el AppBar
        if (!kIsWeb)
          Positioned(
            // En móvil: alineado con el AppBar y más a la izquierda (-4)
            top: logoTopPosition,
            left: -4.0,
            child: IgnorePointer(
              ignoring: true,
              child: SizedBox(
                width: 225,
                height: 225,
                child: Container(
                  padding: const EdgeInsets.all(8.0),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.0),
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                  child: Center(
                    child: Image.asset(
                      'assets/images/logo_21.png',
                      fit: BoxFit.contain,
                      filterQuality: FilterQuality.high,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          padding: const EdgeInsets.all(8.0),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1D4ED8).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8.0),
                          ),
                          child: const Icon(Icons.local_taxi, size: 209, color: Color(0xFF1D4ED8)),
                        );
                      },
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
