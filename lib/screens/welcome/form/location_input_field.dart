import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../l10n/app_localizations.dart';
import 'autocomplete_item.dart';

// Constants
const _kPrimaryColor = Color(0xFF1D4ED8);
const _kBorderRadius = 12.0;
const _kSpacing = 16.0;

/// Campo de entrada de ubicación con autocompletado
/// Extraído de welcome_screen.dart
class LocationInputField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool isPickup;
  final String? activeInputType;
  final List<Map<String, dynamic>> autocompleteResults;
  final Function(String, String) onAddressInputChanged;
  final Function(Map<String, dynamic>, String) onSelectAddress;
  final Function(String, String)? onGeocodeAddress; // Callback opcional para geocodificar

  const LocationInputField({
    super.key,
    required this.label,
    required this.controller,
    required this.focusNode,
    required this.isPickup,
    required this.activeInputType,
    required this.autocompleteResults,
    required this.onAddressInputChanged,
    required this.onSelectAddress,
    this.onGeocodeAddress,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final fieldType = isPickup ? 'pickup' : 'dropoff';
    final isActive = activeInputType == fieldType;

    // Debug: verificar estado del autocompletado
    if (kDebugMode && autocompleteResults.isNotEmpty) {
      debugPrint(
        '[LocationInputField] $fieldType - isActive: $isActive, results: ${autocompleteResults.length}',
      );
    }
    final originHint = (l10n != null && !l10n.originPlaceholder.startsWith('form.'))
        ? l10n.originPlaceholder
        : '¿Dónde te recogemos?';
    final destHint = (l10n != null && !l10n.destinationPlaceholder.startsWith('form.'))
        ? l10n.destinationPlaceholder
        : '¿A dónde vas?';
    final hintText = isPickup ? originHint : destHint;

    return Padding(
      padding: const EdgeInsets.only(bottom: _kSpacing),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextFormField(
            controller: controller,
            focusNode: focusNode,
            enabled: true, // Siempre habilitado para permitir escritura
            keyboardType: TextInputType.streetAddress,
            textInputAction: TextInputAction.next,
            style: GoogleFonts.exo(fontSize: 16, color: Colors.white), // Texto blanco
            decoration: InputDecoration(
              labelText: label,
              labelStyle: GoogleFonts.exo(
                color: Colors.white.withValues(alpha: 0.9),
              ), // Label blanco
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(_kBorderRadius),
                borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.3)), // Borde blanco
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(_kBorderRadius),
                borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.3)), // Borde blanco
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(_kBorderRadius),
                borderSide: BorderSide(
                  color: Colors.white,
                  width: 2,
                ), // Borde blanco cuando está enfocado
              ),
              filled: true,
              fillColor: Colors.white.withValues(alpha: 0.15), // Más transparente con fondo blanco
              prefixIcon: Container(
                margin: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [_kPrimaryColor, _kPrimaryColor.withValues(alpha: 0.7)],
                  ),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isPickup ? Icons.location_on : Icons.flag,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              hintText: hintText,
              hintStyle: GoogleFonts.exo(
                fontSize: 14,
                color: Colors.white.withValues(alpha: 0.6),
              ), // Hint blanco
            ),
            onTapOutside: (event) {
              // Cuando el usuario toca fuera, quitar el focus
              focusNode.unfocus();
            },
            onChanged: (value) {
              // Siempre permitir cambios y activar el campo automáticamente
              onAddressInputChanged(value, fieldType);
            },
            onEditingComplete: () {
              // Cuando el usuario presiona Enter, intentar geocodificar la dirección
              final address = controller.text.trim();
              if (address.isNotEmpty && address.length >= 3) {
                onGeocodeAddress?.call(address, fieldType);
              }
              focusNode.unfocus();
            },
            onFieldSubmitted: (value) {
              // Cuando el usuario presiona Enter, intentar geocodificar la dirección
              final address = value.trim();
              if (address.isNotEmpty && address.length >= 3) {
                onGeocodeAddress?.call(address, fieldType);
              }
              focusNode.unfocus();
            },
          ),
          // Lista de resultados de autocompletado
          if (autocompleteResults.isNotEmpty && isActive)
            Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(_kBorderRadius),
              child: Container(
                margin: const EdgeInsets.only(top: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.95), // Más opaco para mejor visibilidad
                  border: Border.all(color: _kPrimaryColor.withValues(alpha: 0.3)),
                  borderRadius: BorderRadius.circular(_kBorderRadius),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.2),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                constraints: const BoxConstraints(maxHeight: 250),
                child: ListView.builder(
                  shrinkWrap: true,
                  physics:
                      const ClampingScrollPhysics(), // Mejor para móvil dentro de SingleChildScrollView
                  itemCount: autocompleteResults.length,
                  itemBuilder: (context, index) {
                    final result = autocompleteResults[index];
                    // Debug: verificar que el resultado tenga display_name
                    if (kDebugMode) {
                      final displayName = result['display_name'] as String? ?? '';
                      debugPrint(
                        '[LocationInputField] Construyendo item $index: display_name="$displayName"',
                      );
                    }
                    return AutocompleteItem(
                      result: result,
                      type: fieldType,
                      onTap: () => onSelectAddress(result, fieldType),
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
