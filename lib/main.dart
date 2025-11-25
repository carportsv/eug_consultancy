import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'auth/firebase_options.dart';
import 'auth/auth_gate.dart';
import 'auth/supabase_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  // En móvil, el .env debe estar en assets y listado en pubspec.yaml
  try {
    await dotenv.load(fileName: ".env");
    debugPrint('✅ .env cargado exitosamente');
  } catch (e) {
    debugPrint('❌ Error cargando .env: $e');
    debugPrint('⚠️ La app continuará, pero puede fallar la inicialización de Firebase');
  }

  // Initialize Firebase
  if (Firebase.apps.isEmpty) {
    try {
      await Firebase.initializeApp(options: await DefaultFirebaseOptions.currentPlatform);
      debugPrint('✅ Firebase inicializado');
    } catch (e, stackTrace) {
      debugPrint('❌ Error inicializando Firebase: $e');
      debugPrint('Stack trace: $stackTrace');
      // Continuar aunque Firebase falle - la app mostrará un error en AuthGate
    }
  }

  // Initialize Supabase
  try {
    await SupabaseService().initialize();
    debugPrint('✅ Supabase inicializado');
  } catch (e, stackTrace) {
    // Log error but don't crash the app - Supabase operations will fail gracefully
    debugPrint('⚠️ Warning: Could not initialize Supabase: $e');
    debugPrint('Stack trace: $stackTrace');
    // Continuar - las operaciones de Supabase manejarán el error
  }

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(debugShowCheckedModeBanner: false, home: AuthGate());
  }
}
