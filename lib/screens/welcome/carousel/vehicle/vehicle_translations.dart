import 'package:flutter/material.dart';
import '../../../../../l10n/app_localizations.dart';

/// Utilidades para traducción de vehículos
/// Extraído de welcome_screen.dart
class VehicleTranslations {
  /// Obtiene el nombre traducido del vehículo
  static String getVehicleName(String key, BuildContext context) {
    final l10n = AppLocalizations.of(context);
    switch (key) {
      case 'sedan':
        return l10n?.vehicleSedan ?? 'Sedan';
      case 'business':
        return l10n?.vehicleBusiness ?? 'Business';
      case 'minivan7pax':
        return l10n?.vehicleMinivan7pax ?? 'Minivan 7pax';
      case 'minivanLuxury6pax':
        return l10n?.vehicleMinivanLuxury6pax ?? 'Minivan Luxury 6pax';
      case 'minibus8pax':
        return l10n?.vehicleMinibus8pax ?? 'Minibus 8pax';
      case 'bus16pax':
        return l10n?.vehicleBus16pax ?? 'Bus 16pax';
      case 'bus19pax':
        return l10n?.vehicleBus19pax ?? 'Bus 19pax';
      case 'bus50pax':
        return l10n?.vehicleBus50pax ?? 'Bus 50pax';
      default:
        return key;
    }
  }

  /// Obtiene la descripción traducida del vehículo
  static String getVehicleDescription(String key, BuildContext context) {
    final l10n = AppLocalizations.of(context);
    switch (key) {
      case 'sedanDesc':
        return l10n?.vehicleSedanDesc ?? 'Cómodo y confortable';
      case 'businessDesc':
        return l10n?.vehicleBusinessDesc ?? 'Clase ejecutiva';
      case 'minivan7paxDesc':
        return l10n?.vehicleMinivan7paxDesc ?? 'Ideal para grupos medianos';
      case 'minivanLuxury6paxDesc':
        return l10n?.vehicleMinivanLuxury6paxDesc ?? 'Confort premium para grupos';
      case 'minibus8paxDesc':
        return l10n?.vehicleMinibus8paxDesc ?? 'Perfecto para grupos';
      case 'bus16paxDesc':
        return l10n?.vehicleBus16paxDesc ?? 'Para grupos grandes';
      case 'bus19paxDesc':
        return l10n?.vehicleBus19paxDesc ?? 'Capacidad extendida';
      case 'bus50paxDesc':
        return l10n?.vehicleBus50paxDesc ?? 'Para eventos y excursiones';
      default:
        return '';
    }
  }
}
