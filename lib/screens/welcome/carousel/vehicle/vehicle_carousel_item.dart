import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '../../../../../l10n/app_localizations.dart';
import 'vehicle_translations.dart';

/// Item individual del carrusel de vehículos
/// Extraído de welcome_screen.dart
class VehicleCarouselItem extends StatelessWidget {
  final Map<String, dynamic> vehicle;

  const VehicleCarouselItem({super.key, required this.vehicle});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.transparent,
      child: Stack(
        children: [
          // Vehicle Image - Ampliada sin fondo
          Center(
            child: Transform.scale(
              scale: 0.8,
              child: Builder(
                builder: (context) {
                  final imagePath = vehicle['image'] as String;
                  if (kDebugMode) {
                    debugPrint('[VehicleCarousel] Cargando imagen de vehículo: $imagePath');
                  }
                  return Image.asset(
                    imagePath,
                    fit: BoxFit.contain,
                    width: double.infinity,
                    height: double.infinity,
                    errorBuilder: (context, error, stackTrace) {
                      // Si la imagen no existe, mostrar placeholder y loguear error
                      if (kDebugMode) {
                        debugPrint(
                          '[VehicleCarousel] ❌ Error cargando imagen de vehículo: $imagePath',
                        );
                        debugPrint('[VehicleCarousel] Error: ${error.toString()}');
                      }
                      return Container(
                        width: double.infinity,
                        height: double.infinity,
                        color: Colors.grey.shade200,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.directions_car, size: 120, color: Colors.grey.shade400),
                            const SizedBox(height: 16),
                            Builder(
                              builder: (context) {
                                return Text(
                                  VehicleTranslations.getVehicleName(
                                    vehicle['key'] as String,
                                    context,
                                  ),
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey.shade600,
                                  ),
                                );
                              },
                            ),
                            const SizedBox(height: 8),
                            Builder(
                              builder: (context) {
                                final l10n = AppLocalizations.of(context);
                                return Text(
                                  l10n?.imageNotAvailable ?? 'Imagen no disponible',
                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                );
                              },
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
