import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Widget reutilizable que muestra el logo flotante y transparente
/// que se sobrepone sobre el contenido
/// El logo está fijado en una posición absoluta que NO se mueve con el scroll
/// Solo se muestra en web (kIsWeb)
class AppLogoHeader extends StatelessWidget {
  final VoidCallback? onTap;

  const AppLogoHeader({super.key, this.onTap});

  @override
  Widget build(BuildContext context) {
    // Solo mostrar el logo en web
    if (!kIsWeb) {
      return const SizedBox.shrink();
    }

    return Positioned(
      // Posición fija absoluta que NO cambia con el scroll o contenido
      // Estos valores son fijos y no dependen del tamaño del Stack
      // En móvil, usar coordenadas absolutas para evitar que se mueva con el scroll
      top: -60.0,
      left: 16.0,
      // No usar right ni bottom para mantener posición fija
      child: SizedBox(
        // Tamaño fijo para el contenedor
        width: 225,
        height: 225,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(8.0),
            child: Container(
              padding: const EdgeInsets.all(8.0),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.0), // Completamente transparente
                borderRadius: BorderRadius.circular(8.0),
              ),
              // Usar Center para centrar la imagen y mantener proporciones
              child: Center(
                child: Image.asset(
                  'assets/images/logo_21.png',
                  // No especificar width/height aquí, dejar que BoxFit.contain mantenga proporciones
                  fit: BoxFit.contain,
                  // Evitar que la imagen se redimensione o se mueva
                  filterQuality: FilterQuality.high,
                  // No usar cacheWidth/cacheHeight para evitar distorsión
                  errorBuilder: (context, error, stackTrace) {
                    // Si el logo no se encuentra, mostrar un icono de respaldo
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
    );
  }
}
