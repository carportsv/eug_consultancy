import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/services.dart';
import 'package:flutter/cupertino.dart';
import '../../../auth/supabase_service.dart';
import '../../welcome/form/address_autocomplete_service.dart';
import '../../welcome/form/ride_calculation_service.dart';

// Constants
const _kPrimaryColor = Color(0xFF1D4ED8);
const _kTextColor = Color(0xFF1A202C);
const _kSpacing = 16.0;
const _kBorderRadius = 12.0;

/// Pantalla para crear una nueva reserva de viaje
class NewBookingScreen extends StatefulWidget {
  /// Callback opcional que se ejecuta cuando se crea exitosamente un viaje
  /// Útil para navegar de vuelta a home en modo pantalla ancha
  final VoidCallback? onRideCreated;

  const NewBookingScreen({super.key, this.onRideCreated});

  @override
  State<NewBookingScreen> createState() => _NewBookingScreenState();
}

class _NewBookingScreenState extends State<NewBookingScreen> {
  // Form Key
  final _formKey = GlobalKey<FormState>();

  // Form Controllers
  final _originController = TextEditingController();
  final _destinationController = TextEditingController();
  final _priceController = TextEditingController();
  final _distanceController = TextEditingController();
  final _clientNameController = TextEditingController();
  final _phoneNumberController = TextEditingController();
  final _flightNumberController = TextEditingController();
  final _dateController = TextEditingController();
  final _timeController = TextEditingController();
  final _notesController = TextEditingController();

  // Form State
  String _selectedPriority = 'normal';
  String? _selectedDriver;
  bool _isLoading = false;
  List<Map<String, dynamic>> _drivers = [];
  final SupabaseService _supabaseService = SupabaseService();

  // Map State
  final MapController _mapController = MapController();
  bool _isMapReady = false; // Flag para saber si el mapa está listo
  LatLng? _originCoords;
  LatLng? _destinationCoords;
  Marker? _originMarker;
  Marker? _destinationMarker;
  Polyline? _routePolyline;
  String? _activeInputType; // 'origin' or 'destination'
  List<Map<String, dynamic>> _autocompleteResults = [];
  final FocusNode _originFocusNode = FocusNode();
  final FocusNode _destinationFocusNode = FocusNode();
  LatLng? _currentLocation;
  bool _isLoadingLocation = false;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _loadDrivers();
    _getCurrentLocation();

    // Agregar listeners a los FocusNodes para geocodificar cuando pierden el foco
    _originFocusNode.addListener(() {
      if (!_originFocusNode.hasFocus && _originController.text.trim().isNotEmpty) {
        // Si el campo pierde el foco y hay texto, pero no hay coordenadas, intentar geocodificar
        if (_originCoords == null && _originController.text.trim().length >= 3) {
          _geocodeAddress(_originController.text.trim(), 'origin');
        }
      }
    });

    _destinationFocusNode.addListener(() {
      if (!_destinationFocusNode.hasFocus && _destinationController.text.trim().isNotEmpty) {
        // Si el campo pierde el foco y hay texto, pero no hay coordenadas, intentar geocodificar
        if (_destinationCoords == null && _destinationController.text.trim().length >= 3) {
          _geocodeAddress(_destinationController.text.trim(), 'destination');
        }
      }
    });
  }

  Future<void> _getCurrentLocation() async {
    if (_isLoadingLocation) return;

    setState(() => _isLoadingLocation = true);

    try {
      // Verificar permisos
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (kDebugMode) {
          debugPrint('⚠️ Servicios de ubicación deshabilitados');
        }
        setState(() => _isLoadingLocation = false);
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (kDebugMode) {
            debugPrint('⚠️ Permisos de ubicación denegados');
          }
          setState(() => _isLoadingLocation = false);
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (kDebugMode) {
          debugPrint('⚠️ Permisos de ubicación denegados permanentemente');
        }
        setState(() => _isLoadingLocation = false);
        return;
      }

      // Obtener ubicación actual
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );

      final location = LatLng(position.latitude, position.longitude);

      setState(() {
        _currentLocation = location;
        _isLoadingLocation = false;
      });

      // Centrar el mapa en la ubicación actual solo si está listo
      if (mounted && _isMapReady) {
        try {
          _mapController.move(location, _mapController.camera.zoom);
        } catch (e) {
          if (kDebugMode) {
            debugPrint('⚠️ No se pudo mover el mapa (aún no está listo): $e');
          }
        }
      } else if (mounted) {
        // El mapa aún no está listo, se centrará cuando esté listo en onMapReady
        if (kDebugMode) {
          debugPrint('⏳ Mapa aún no está listo, se centrará cuando esté disponible');
        }
      }

      if (kDebugMode) {
        debugPrint('✅ Ubicación actual obtenida: ${position.latitude}, ${position.longitude}');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error obteniendo ubicación: $e');
      }
      setState(() => _isLoadingLocation = false);
    }
  }

  @override
  void dispose() {
    // Dispose all controllers
    _originController.dispose();
    _destinationController.dispose();
    _priceController.dispose();
    _distanceController.dispose();
    _clientNameController.dispose();
    _phoneNumberController.dispose();
    _flightNumberController.dispose();
    _dateController.dispose();
    _timeController.dispose();
    _notesController.dispose();
    _mapController.dispose();
    _originFocusNode.dispose();
    _destinationFocusNode.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.grey.shade50, Colors.white],
        ),
      ),
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Section
          _buildHeader(context),
          const SizedBox(height: _kSpacing * 1.5),

          // Main Content
          Expanded(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return constraints.maxWidth > 900 ? _buildWideLayout() : _buildNarrowLayout();
              },
            ),
          ),
        ],
      ),
    );
  }

  // ========== Layout Builders ==========

  Widget _buildWideLayout() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Form Section
        Expanded(flex: 2, child: _buildForm()),

        // Spacer
        const SizedBox(width: _kSpacing * 1.5),

        // Map Section
        Expanded(flex: 3, child: _buildMapPlaceholder()),
      ],
    );
  }

  Widget _buildNarrowLayout() {
    return _buildForm();
  }

  // ========== UI Components ==========

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _kPrimaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(Icons.add_road, color: _kPrimaryColor, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Create New Ride',
                  style: GoogleFonts.exo(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: _kTextColor,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Fill in the details to create a new ride request',
                  style: GoogleFonts.exo(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildForm() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              // Location Fields with autocomplete
              _buildAddressField(
                label: 'Origin *',
                controller: _originController,
                focusNode: _originFocusNode,
                icon: Icons.location_on,
                type: 'origin',
                validator: _validateRequiredField,
              ),

              _buildAddressField(
                label: 'Destination *',
                controller: _destinationController,
                focusNode: _destinationFocusNode,
                icon: Icons.flag,
                type: 'destination',
                validator: _validateRequiredField,
              ),

              // Price & Distance Row
              Row(
                children: [
                  Expanded(
                    child: _buildTextFormField(
                      label: 'Price (\$)',
                      controller: _priceController,
                      isNumeric: true,
                      validator: _validatePrice,
                    ),
                  ),
                  const SizedBox(width: _kSpacing),
                  Expanded(
                    child: _buildTextFormField(
                      label: 'Distance (km)',
                      controller: _distanceController,
                      isNumeric: true,
                      readOnly: true,
                    ),
                  ),
                ],
              ),

              // Client Info
              _buildTextFormField(
                label: 'Client Name *',
                controller: _clientNameController,
                validator: _validateRequiredField,
              ),

              // Phone Number & Flight Number
              Row(
                children: [
                  Expanded(
                    child: _buildTextFormField(
                      label: 'Phone Number',
                      controller: _phoneNumberController,
                      icon: Icons.phone,
                    ),
                  ),
                  const SizedBox(width: _kSpacing),
                  Expanded(
                    child: _buildTextFormField(
                      label: 'Flight Number',
                      controller: _flightNumberController,
                      icon: Icons.flight,
                    ),
                  ),
                ],
              ),

              // Date & Time Picker
              Row(
                children: [
                  Expanded(
                    child: _buildDatePickerField(label: 'Ride Date', controller: _dateController),
                  ),
                  const SizedBox(width: _kSpacing),
                  Expanded(
                    child: _buildTimePickerField(label: 'Ride Time', controller: _timeController),
                  ),
                ],
              ),

              // Priority Dropdown
              _buildDropdownFormField(
                label: 'Priority',
                value: _selectedPriority,
                items: const ['normal', 'low', 'high', 'urgent'],
                onChanged: (val) => setState(() => _selectedPriority = val!),
              ),

              // Additional Notes
              _buildTextFormField(
                label: 'Additional Notes',
                controller: _notesController,
                maxLines: 3,
              ),

              // Driver Dropdown
              _buildDriverDropdown(),

              // Action Buttons
              const SizedBox(height: _kSpacing * 1.5),
              _buildActionButtons(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMapPlaceholder() {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          height: constraints.maxHeight > 0 ? constraints.maxHeight : 600,
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200, width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 15,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: _currentLocation == null && _isLoadingLocation
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('Obteniendo ubicación...', style: TextStyle(color: Colors.grey)),
                      ],
                    ),
                  )
                : FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter:
                          _currentLocation ??
                          (_originCoords ?? (_destinationCoords ?? const LatLng(0, 0))),
                      initialZoom:
                          _currentLocation != null ||
                              _originCoords != null ||
                              _destinationCoords != null
                          ? 13.0
                          : 2.0,
                      onMapReady: () {
                        // Marcar el mapa como listo cuando se renderiza por primera vez
                        if (kDebugMode) {
                          debugPrint('[NewBookingScreen] ✅ Mapa listo para usar');
                        }
                        setState(() {
                          _isMapReady = true;
                        });

                        // Si tenemos una ubicación actual pero el mapa no se centró antes,
                        // centrarlo ahora que está listo
                        if (_currentLocation != null) {
                          Future.microtask(() {
                            try {
                              _mapController.move(_currentLocation!, 13.0);
                              if (kDebugMode) {
                                debugPrint(
                                  '[NewBookingScreen] 🗺️ Mapa centrado en ubicación actual',
                                );
                              }
                            } catch (e) {
                              if (kDebugMode) {
                                debugPrint('[NewBookingScreen] ⚠️ Error centrando mapa: $e');
                              }
                            }
                          });
                        }

                        // Si hay coordenadas iniciales, calcular ruta y precio
                        if (_originCoords != null && _destinationCoords != null) {
                          Future.microtask(() {
                            _calculateRoute();
                          });
                        }
                      },
                      onTap: _handleMapTap,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.consultancy.app',
                      ),
                      if (_originMarker != null) MarkerLayer(markers: [_originMarker!]),
                      if (_destinationMarker != null) MarkerLayer(markers: [_destinationMarker!]),
                      if (_routePolyline != null) PolylineLayer(polylines: [_routePolyline!]),
                    ],
                  ),
          ),
        );
      },
    );
  }

  Widget _buildAddressField({
    required String label,
    required TextEditingController controller,
    required FocusNode focusNode,
    required IconData icon,
    required String type,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: _kSpacing),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextFormField(
            controller: controller,
            focusNode: focusNode,
            readOnly: false, // Siempre editable
            style: GoogleFonts.exo(fontSize: 15, fontWeight: FontWeight.w500, color: _kTextColor),
            decoration: InputDecoration(
              labelText: label,
              labelStyle: GoogleFonts.exo(
                fontSize: 14,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
              ),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300, width: 1),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300, width: 1),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: _kPrimaryColor, width: 2),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.red.shade300, width: 1),
              ),
              focusedErrorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.red, width: 2),
              ),
              prefixIcon: Container(
                margin: const EdgeInsets.all(8),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _kPrimaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: _kPrimaryColor, size: 20),
              ),
              suffixIcon: Container(
                margin: const EdgeInsets.only(right: 8),
                child: IconButton(
                  icon: Icon(Icons.map, size: 20, color: _kPrimaryColor),
                  tooltip: 'Take from map',
                  onPressed: () => _selectFromMap(type),
                  style: IconButton.styleFrom(
                    backgroundColor: _kPrimaryColor.withValues(alpha: 0.1),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            ),
            validator: validator,
            onChanged: (value) => _onAddressInputChanged(value, type),
            onEditingComplete: () {
              // Cuando el usuario presiona Enter, intentar geocodificar la dirección
              final address = controller.text.trim();
              if (address.isNotEmpty && address.length >= 3) {
                _geocodeAddress(address, type);
              }
              focusNode.unfocus();
            },
            onFieldSubmitted: (value) {
              // Cuando el usuario presiona Enter, intentar geocodificar la dirección
              final address = value.trim();
              if (address.isNotEmpty && address.length >= 3) {
                _geocodeAddress(address, type);
              }
              focusNode.unfocus();
            },
          ),
          if (_autocompleteResults.isNotEmpty && _activeInputType == type)
            Container(
              margin: const EdgeInsets.only(top: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: Colors.grey.shade200, width: 1),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              constraints: const BoxConstraints(maxHeight: 200),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _autocompleteResults.length,
                itemBuilder: (context, index) {
                  final result = _autocompleteResults[index];
                  final address = result['display_name'] as String? ?? '';
                  return InkWell(
                    onTap: () => _selectAddressFromAutocomplete(result, type),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: Colors.grey.shade100,
                            width: index < _autocompleteResults.length - 1 ? 1 : 0,
                          ),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.location_on,
                            size: 18,
                            color: _kPrimaryColor.withValues(alpha: 0.7),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              address,
                              style: GoogleFonts.exo(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: _kTextColor,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        // Cancel Button
        TextButton(onPressed: _handleCancel, child: const Text('Cancel')),

        const SizedBox(width: _kSpacing / 2),

        // Create Ride Button
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: _kPrimaryColor,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          ),
          onPressed: _isLoading ? null : _handleCreateRide,
          child: _isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text('Create Ride', style: TextStyle(color: Colors.white, fontSize: 16)),
        ),
      ],
    );
  }

  // ========== Form Field Builders ==========

  Widget _buildTextFormField({
    required String label,
    required TextEditingController controller,
    IconData? icon,
    bool isNumeric = false,
    bool readOnly = false,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: _kSpacing),
      child: TextFormField(
        controller: controller,
        readOnly: readOnly,
        keyboardType: isNumeric
            ? const TextInputType.numberWithOptions(decimal: true)
            : TextInputType.text,
        maxLines: maxLines,
        style: GoogleFonts.exo(fontSize: 15, fontWeight: FontWeight.w500, color: _kTextColor),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.exo(
            fontSize: 14,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
          ),
          filled: true,
          fillColor: readOnly ? Colors.grey.shade50 : Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300, width: 1),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300, width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: _kPrimaryColor, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.red.shade300, width: 1),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.red, width: 2),
          ),
          prefixIcon: icon != null
              ? Container(
                  margin: const EdgeInsets.all(8),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _kPrimaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: _kPrimaryColor, size: 20),
                )
              : null,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
        validator: validator,
      ),
    );
  }

  Widget _buildDatePickerField({required String label, required TextEditingController controller}) {
    DateTime? selectedDate;
    if (controller.text.isNotEmpty) {
      try {
        selectedDate = DateFormat('yyyy-MM-dd').parse(controller.text);
      } catch (e) {
        // Si hay error, usar null
      }
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: _kSpacing),
      child: GestureDetector(
        onTap: _showDatePicker,
        child: Container(
          height: 56,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(_kBorderRadius),
            border: Border.all(
              color: selectedDate != null ? _kPrimaryColor : Colors.grey.shade400,
              width: 1.5,
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _kPrimaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(Icons.calendar_today, color: _kPrimaryColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: GoogleFonts.exo(
                        fontSize: 11,
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      selectedDate != null
                          ? DateFormat('dd/MM/yyyy').format(selectedDate)
                          : 'Seleccionar fecha',
                      style: GoogleFonts.exo(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: selectedDate != null ? _kTextColor : Colors.grey.shade400,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (selectedDate != null) Icon(Icons.check_circle, color: _kPrimaryColor, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTimePickerField({required String label, required TextEditingController controller}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: _kSpacing),
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(_kBorderRadius),
          border: Border.all(
            color: controller.text.isNotEmpty ? _kPrimaryColor : Colors.grey.shade400,
            width: 1.5,
          ),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _kPrimaryColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.access_time, color: _kPrimaryColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                controller: controller,
                style: GoogleFonts.exo(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: _kTextColor,
                ),
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[0-9:]')),
                  _TimeInputFormatter(),
                ],
                decoration: InputDecoration(
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: EdgeInsets.zero,
                  labelText: label,
                  labelStyle: GoogleFonts.exo(
                    fontSize: 11,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
                  floatingLabelBehavior: FloatingLabelBehavior.always,
                  hintText: 'HH:mm (ej: 08:30)',
                  hintStyle: GoogleFonts.exo(fontSize: 14, color: Colors.grey.shade400),
                ),
              ),
            ),
            IconButton(
              icon: Icon(Icons.access_time, color: _kPrimaryColor, size: 20),
              onPressed: _showTimePicker,
              tooltip: 'Seleccionar hora',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDropdownFormField({
    required String label,
    required String? value,
    required List<String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: _kSpacing),
      child: DropdownButtonFormField<String>(
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.exo(
            fontSize: 14,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
          ),
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300, width: 1),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300, width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: _kPrimaryColor, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
        style: GoogleFonts.exo(fontSize: 15, fontWeight: FontWeight.w500, color: _kTextColor),
        initialValue: items.contains(value) ? value : null,
        hint: Text(
          'Select an option',
          style: GoogleFonts.exo(fontSize: 15, color: Colors.grey.shade400),
        ),
        items: items
            .map(
              (String item) => DropdownMenuItem<String>(
                value: item,
                child: Text(
                  item,
                  style: GoogleFonts.exo(fontSize: 15, fontWeight: FontWeight.w500),
                ),
              ),
            )
            .toList(),
        onChanged: onChanged,
        isExpanded: true,
        icon: Icon(Icons.keyboard_arrow_down, color: _kPrimaryColor),
      ),
    );
  }

  Widget _buildDriverDropdown() {
    final driverItems = <String?>[null, ..._drivers.map((d) => d['id'] as String)];
    final displayItems = [
      'Unassigned (remains pending)',
      ..._drivers.map((d) {
        // Now drivers come directly from users table, so we can access fields directly
        final displayName =
            d['display_name'] as String? ?? d['email'] as String? ?? 'Driver ${d['id']}';
        return displayName;
      }),
    ];

    return Padding(
      padding: const EdgeInsets.only(bottom: _kSpacing),
      child: DropdownButtonFormField<String>(
        decoration: InputDecoration(
          labelText: 'Driver (Optional)',
          labelStyle: GoogleFonts.exo(
            fontSize: 14,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
          ),
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300, width: 1),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300, width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: _kPrimaryColor, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          prefixIcon: Container(
            margin: const EdgeInsets.all(8),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: _kPrimaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.person, color: _kPrimaryColor, size: 20),
          ),
        ),
        style: GoogleFonts.exo(fontSize: 15, fontWeight: FontWeight.w500, color: _kTextColor),
        initialValue: _selectedDriver,
        hint: Text(
          'Select a driver',
          style: GoogleFonts.exo(fontSize: 15, color: Colors.grey.shade400),
        ),
        items: List.generate(
          driverItems.length,
          (index) => DropdownMenuItem<String>(
            value: driverItems[index],
            child: Text(
              displayItems[index],
              style: GoogleFonts.exo(fontSize: 15, fontWeight: FontWeight.w500),
            ),
          ),
        ),
        onChanged: (val) => setState(() => _selectedDriver = val),
        isExpanded: true,
        icon: Icon(Icons.keyboard_arrow_down, color: _kPrimaryColor),
      ),
    );
  }

  // ========== Event Handlers ==========

  Future<void> _showDatePicker() async {
    DateTime initialDate = DateTime.now();
    if (_dateController.text.isNotEmpty) {
      try {
        final parsed = DateFormat('yyyy-MM-dd').parse(_dateController.text);
        initialDate = parsed;
      } catch (e) {
        initialDate = DateTime.now();
      }
    }

    await showDialog(
      context: context,
      builder: (context) => _CustomDatePickerDialog(
        initialDate: initialDate,
        firstDate: DateTime.now(),
        lastDate: DateTime(2101),
        onDateSelected: (date) {
          setState(() {
            _dateController.text = DateFormat('yyyy-MM-dd').format(date);
          });
          Navigator.of(context).pop();
        },
      ),
    );
  }

  Future<void> _showTimePicker() async {
    // Intentar parsear la hora del campo de texto
    TimeOfDay initialTime = TimeOfDay.now();
    if (_timeController.text.isNotEmpty) {
      try {
        final parts = _timeController.text.split(':');
        if (parts.length == 2) {
          final hour = int.tryParse(parts[0]) ?? TimeOfDay.now().hour;
          final minute = int.tryParse(parts[1]) ?? TimeOfDay.now().minute;
          initialTime = TimeOfDay(hour: hour.clamp(0, 23), minute: minute.clamp(0, 59));
        }
      } catch (e) {
        // Si hay error, usar hora actual
      }
    }

    await showDialog(
      context: context,
      builder: (context) => _CustomTimePickerDialog(
        initialTime: initialTime,
        onTimeSelected: (time) {
          setState(() {
            _timeController.text = DateFormat(
              'HH:mm',
            ).format(DateTime(2000, 1, 1, time.hour, time.minute));
          });
          Navigator.of(context).pop();
        },
      ),
    );
  }

  void _handleCancel() {
    Navigator.of(context).pop();
  }

  Future<void> _loadDrivers() async {
    try {
      final supabaseClient = _supabaseService.client;
      // Load drivers from users table with role=driver, similar to HTML version
      final response = await supabaseClient
          .from('users')
          .select('id, display_name, email, phone_number')
          .eq('role', 'driver')
          .eq('is_active', true)
          .order('display_name', ascending: true);

      if (kDebugMode) {
        debugPrint('✅ Drivers loaded: ${response.length}');
      }

      setState(() {
        _drivers = List<Map<String, dynamic>>.from(response);
      });
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error loading drivers: $e');
      }
    }
  }

  Future<void> _handleCreateRide() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Get current Firebase user
      final firebaseUser = FirebaseAuth.instance.currentUser;
      if (firebaseUser == null) {
        throw Exception('User not authenticated');
      }

      // Get Supabase user ID from Firebase UID
      final supabaseClient = _supabaseService.client;
      final userResponse = await supabaseClient
          .from('users')
          .select('id')
          .eq('firebase_uid', firebaseUser.uid)
          .maybeSingle();

      final userId = userResponse?['id'] as String?;
      if (userId == null) {
        throw Exception('User not found in Supabase. Please sync your account first.');
      }

      // Parse form data
      final originAddress = _originController.text.trim();
      final destinationAddress = _destinationController.text.trim();
      final price = double.tryParse(_priceController.text.trim());
      final distance = double.tryParse(_distanceController.text.trim());
      final clientName = _clientNameController.text.trim();
      final phoneNumber = _phoneNumberController.text.trim();
      final flightNumber = _flightNumberController.text.trim();
      final notes = _notesController.text.trim();
      final scheduledDate = _dateController.text.trim();
      final scheduledTime = _timeController.text.trim();

      // Validate required fields
      if (originAddress.isEmpty ||
          destinationAddress.isEmpty ||
          price == null ||
          clientName.isEmpty) {
        throw Exception('Please fill in all required fields');
      }

      // Prepare ride data (similar to JavaScript version)
      final rideData = <String, dynamic>{
        'user_id': userId,
        'origin': {
          'address': originAddress,
          'coordinates': {
            'latitude': _originCoords?.latitude ?? 0.0,
            'longitude': _originCoords?.longitude ?? 0.0,
          },
        },
        'destination': {
          'address': destinationAddress,
          'coordinates': {
            'latitude': _destinationCoords?.latitude ?? 0.0,
            'longitude': _destinationCoords?.longitude ?? 0.0,
          },
        },
        'status': 'requested',
        'price': price,
        'client_name': clientName,
        'priority': _selectedPriority.toLowerCase(),
        'created_at': DateTime.now().toIso8601String(),
      };

      // Add optional fields
      if (distance != null && distance > 0) {
        rideData['distance'] = distance * 1000; // Convert km to meters
      }

      if (phoneNumber.isNotEmpty) {
        rideData['phone_number'] = phoneNumber;
      }

      if (flightNumber.isNotEmpty) {
        rideData['flight_number'] = flightNumber;
      }

      if (notes.isNotEmpty) {
        rideData['additional_notes'] = notes;
      }

      // Obtener driver_id de la tabla drivers si se seleccionó un driver
      if (kDebugMode) {
        debugPrint('[NewBookingScreen] 🔍 Verificando conductor seleccionado: $_selectedDriver');
      }
      if (_selectedDriver != null && _selectedDriver!.isNotEmpty) {
        if (kDebugMode) {
          debugPrint('[NewBookingScreen] 🔍 Buscando driver_id para user_id: $_selectedDriver');
        }
        try {
          // Buscar el driver_id en la tabla drivers usando el user_id
          final driverResponse = await supabaseClient
              .from('drivers')
              .select('id')
              .eq('user_id', _selectedDriver!)
              .maybeSingle();

          if (kDebugMode) {
            debugPrint('[NewBookingScreen] 📋 Respuesta de drivers: $driverResponse');
          }

          final driverId = driverResponse?['id'] as String?;
          if (driverId != null) {
            rideData['driver_id'] = driverId;
            if (kDebugMode) {
              debugPrint('[NewBookingScreen] ✅ Driver ID encontrado: ${rideData['driver_id']}');
            }
          } else {
            // Si no existe el registro en drivers, crearlo
            if (kDebugMode) {
              debugPrint(
                '[NewBookingScreen] ⚠️ Driver no encontrado en tabla drivers, creando registro para user_id: $_selectedDriver',
              );
            }
            try {
              final newDriverResponse = await supabaseClient
                  .from('drivers')
                  .insert({'user_id': _selectedDriver!, 'is_available': false, 'status': 'active'})
                  .select('id')
                  .single();

              if (kDebugMode) {
                debugPrint('[NewBookingScreen] 📋 Respuesta de creación: $newDriverResponse');
              }

              final newDriverId = newDriverResponse['id'] as String?;
              if (newDriverId != null) {
                rideData['driver_id'] = newDriverId;
                if (kDebugMode) {
                  debugPrint('[NewBookingScreen] ✅ Driver creado con ID: ${rideData['driver_id']}');
                }
              } else {
                throw Exception(
                  'No se pudo crear el registro del conductor. La respuesta no contiene un ID válido.',
                );
              }
            } catch (insertError) {
              if (kDebugMode) {
                debugPrint('[NewBookingScreen] ❌ Error creando driver: $insertError');
              }
              throw Exception(
                'No se pudo crear el registro del conductor: ${insertError.toString()}. Por favor, verifica que el conductor esté registrado correctamente.',
              );
            }
          }
        } catch (e) {
          if (kDebugMode) {
            debugPrint('[NewBookingScreen] ❌ Error obteniendo driver_id: $e');
            debugPrint('[NewBookingScreen] Stack trace: ${StackTrace.current}');
          }
          throw Exception(
            'Error al asignar el conductor: ${e.toString()}. Por favor, intenta sin asignar un conductor o verifica que el conductor esté registrado correctamente.',
          );
        }
      } else {
        if (kDebugMode) {
          debugPrint('[NewBookingScreen] ℹ️ No se seleccionó ningún conductor');
        }
      }

      // Handle scheduled rides
      if (scheduledDate.isNotEmpty && scheduledTime.isNotEmpty) {
        try {
          final scheduledDateTime = DateTime.parse('${scheduledDate}T$scheduledTime');
          final now = DateTime.now();

          if (scheduledDateTime.isAfter(now)) {
            rideData['scheduled_at'] = scheduledDateTime.toIso8601String();
            rideData['is_scheduled'] = true;
          } else {
            throw Exception('Scheduled date and time must be in the future');
          }
        } catch (e) {
          throw Exception('Invalid date or time format');
        }
      }

      // Create ride in Supabase
      if (kDebugMode) {
        debugPrint('Creating ride with data: $rideData');
      }

      await supabaseClient.from('ride_requests').insert(rideData);

      if (mounted) {
        // Reset loading state first
        setState(() => _isLoading = false);

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Ride created successfully!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );

        // Clear form data
        _clearForm();

        // Option 2: Navigate back to admin home
        // Wait a moment for the success message to be visible, then navigate back
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) {
            // First, try the callback (for wide screen mode)
            if (widget.onRideCreated != null) {
              widget.onRideCreated!();
            } else {
              // If no callback, try to pop (for mobile/narrow screens)
              if (Navigator.of(context).canPop()) {
                Navigator.of(context).pop();
              }
            }
          }
        });
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error creating ride: $e');
      }
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error creating ride: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // ========== Form Management Methods ==========

  void _clearForm() {
    // Clear all text controllers
    _originController.clear();
    _destinationController.clear();
    _priceController.clear();
    _distanceController.clear();
    _clientNameController.clear();
    _phoneNumberController.clear();
    _flightNumberController.clear();
    _dateController.clear();
    _timeController.clear();
    _notesController.clear();

    // Clear map state
    setState(() {
      _selectedPriority = 'normal';
      _selectedDriver = null;
      _originCoords = null;
      _destinationCoords = null;
      _originMarker = null;
      _destinationMarker = null;
      _routePolyline = null;
      _autocompleteResults = [];
      _activeInputType = null;
    });

    // Reset form validation
    _formKey.currentState?.reset();

    // Center map on current location if available
    if (_currentLocation != null) {
      _mapController.move(_currentLocation!, 13.0);
    }
  }

  // ========== Validation Methods ==========

  String? _validateRequiredField(String? value) {
    if (value == null || value.isEmpty) {
      return 'This field is required';
    }
    return null;
  }

  String? _validatePrice(String? value) {
    if (value == null || value.isEmpty) {
      return 'Price is required';
    }
    if (double.tryParse(value) == null) {
      return 'Please enter a valid number';
    }
    return null;
  }

  // ========== Map and Address Methods ==========

  void _selectFromMap(String type) {
    setState(() {
      _activeInputType = type;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Tap on the map to select ${type == 'origin' ? 'origin' : 'destination'}'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _handleMapTap(TapPosition position, LatLng point) {
    if (_activeInputType == null) return;

    if (_activeInputType == 'origin') {
      _originCoords = point;
      _updateOriginMarker(point);
      _reverseGeocode(point, _originController, 'origin');
    } else {
      _destinationCoords = point;
      _updateDestinationMarker(point);
      _reverseGeocode(point, _destinationController, 'destination');
    }

    // Calcular ruta si ambos puntos están establecidos
    if (_originCoords != null && _destinationCoords != null) {
      _calculateRoute();
    }

    setState(() {
      _activeInputType = null;
    });
  }

  void _updateOriginMarker(LatLng point) {
    if (kDebugMode) {
      debugPrint(
        '[NewBookingScreen] 📍 Actualizando marcador de origen: ${point.latitude}, ${point.longitude}',
      );
    }
    setState(() {
      _originMarker = Marker(
        point: point,
        width: 50,
        height: 50,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.red,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 8, spreadRadius: 2),
            ],
          ),
          child: const Icon(Icons.location_on, color: Colors.white, size: 30),
        ),
      );
    });
    if (kDebugMode) {
      debugPrint('[NewBookingScreen] ✅ Marcador de origen creado: $_originMarker');
    }
    // Forzar actualización del mapa después de crear el marcador
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 50), () {
        _centerMapOnPoints();
      });
    });
  }

  void _updateDestinationMarker(LatLng point) {
    if (kDebugMode) {
      debugPrint(
        '[NewBookingScreen] 🎯 Actualizando marcador de destino: ${point.latitude}, ${point.longitude}',
      );
    }
    setState(() {
      _destinationMarker = Marker(
        point: point,
        width: 50,
        height: 50,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.green,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 8, spreadRadius: 2),
            ],
          ),
          child: const Icon(Icons.flag, color: Colors.white, size: 30),
        ),
      );
    });
    if (kDebugMode) {
      debugPrint('[NewBookingScreen] ✅ Marcador de destino creado: $_destinationMarker');
    }
    // Forzar actualización del mapa después de crear el marcador
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 50), () {
        _centerMapOnPoints();
      });
    });
  }

  void _centerMapOnPoints() {
    // Verificar que el mapa esté listo antes de usar el MapController
    if (!_isMapReady) {
      if (kDebugMode) {
        debugPrint('[NewBookingScreen] ⏳ Mapa aún no está listo, esperando...');
      }
      // Reintentar después de un delay
      Future.delayed(const Duration(milliseconds: 100), () {
        if (mounted) {
          _centerMapOnPoints();
        }
      });
      return;
    }

    if (kDebugMode) {
      debugPrint(
        '[NewBookingScreen] 🗺️ Centrando mapa - Origen: $_originCoords, Destino: $_destinationCoords',
      );
    }

    try {
      if (_originCoords != null && _destinationCoords != null) {
        final centerLat = (_originCoords!.latitude + _destinationCoords!.latitude) / 2;
        final centerLon = (_originCoords!.longitude + _destinationCoords!.longitude) / 2;
        final center = LatLng(centerLat, centerLon);

        // Usar la distancia real de la ruta si está disponible, sino calcular distancia en línea recta
        double distanceInKm;
        final distanceText = _distanceController.text.trim();
        if (distanceText.isNotEmpty) {
          final parsedDistance = double.tryParse(distanceText);
          if (parsedDistance != null && parsedDistance > 0) {
            distanceInKm = parsedDistance; // Usar distancia real de la ruta
          } else {
            // Si no hay distancia válida, calcular en línea recta
            const distance = Distance();
            distanceInKm = distance.as(LengthUnit.Kilometer, _originCoords!, _destinationCoords!);
          }
        } else {
          // Si no hay distancia en el controlador, calcular en línea recta
          const distance = Distance();
          distanceInKm = distance.as(LengthUnit.Kilometer, _originCoords!, _destinationCoords!);
        }

        // Calcular zoom para asegurar que ambos marcadores sean visibles con margen
        // Usar la distancia real de la ruta para un zoom más preciso
        double zoom;
        if (distanceInKm < 1) {
          zoom = 15.0;
        } else if (distanceInKm < 5) {
          zoom = 13.0;
        } else if (distanceInKm < 20) {
          zoom = 11.0;
        } else if (distanceInKm < 50) {
          zoom = 9.0;
        } else if (distanceInKm < 100) {
          zoom = 10.5; // Zoom más cercano para rutas de 50-100 km
        } else {
          zoom = 9.0; // Zoom para distancias > 100 km
        }

        if (kDebugMode) {
          debugPrint(
            '[NewBookingScreen] 🗺️ Moviendo mapa a centro: $center, zoom: $zoom (distancia: ${distanceInKm.toStringAsFixed(2)} km)',
          );
        }
        _mapController.move(center, zoom);
      } else if (_originCoords != null) {
        if (kDebugMode) {
          debugPrint('[NewBookingScreen] 🗺️ Moviendo mapa a origen: $_originCoords');
        }
        _mapController.move(_originCoords!, 15.0);
      } else if (_destinationCoords != null) {
        if (kDebugMode) {
          debugPrint('[NewBookingScreen] 🗺️ Moviendo mapa a destino: $_destinationCoords');
        }
        _mapController.move(_destinationCoords!, 15.0);
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[NewBookingScreen] ❌ Error moviendo mapa: $e');
      }
      // Si hay error, el mapa aún no está listo, reintentar
      _isMapReady = false;
      Future.delayed(const Duration(milliseconds: 200), () {
        if (mounted) {
          _centerMapOnPoints();
        }
      });
    }
  }

  Future<void> _onAddressInputChanged(String query, String type) async {
    _debounceTimer?.cancel();

    // Activar automáticamente el campo cuando el usuario escribe
    if (_activeInputType != type) {
      setState(() {
        _activeInputType = type;
      });
    }

    if (query.length < 2) {
      setState(() {
        _autocompleteResults = [];
      });
      return;
    }

    if (kDebugMode) {
      debugPrint('[NewBookingScreen] Buscando direcciones para: "$query" (type: $type)');
    }

    _debounceTimer = Timer(const Duration(milliseconds: 300), () async {
      try {
        final results = await _searchAddresses(query);
        if (kDebugMode) {
          debugPrint('[NewBookingScreen] Resultados recibidos: ${results.length}');
        }
        if (mounted && _activeInputType == type) {
          setState(() {
            _autocompleteResults = results;
          });
          if (kDebugMode) {
            debugPrint(
              '[NewBookingScreen] Autocompletado actualizado: ${results.length} resultados',
            );
          }
        } else if (kDebugMode) {
          debugPrint(
            '[NewBookingScreen] No actualizando: mounted=$mounted, activeInputType=$_activeInputType, type=$type',
          );
        }
      } catch (e) {
        if (kDebugMode) {
          debugPrint('[NewBookingScreen] Error buscando direcciones: $e');
        }
        if (mounted && _activeInputType == type) {
          setState(() {
            _autocompleteResults = [];
          });
        }
      }
    });
  }

  Future<List<Map<String, dynamic>>> _searchAddresses(String query) async {
    try {
      // Usar el servicio de autocompletado con fallback
      final results = await AddressAutocompleteService.searchAddresses(query);
      if (kDebugMode) {
        debugPrint('[NewBookingScreen] Resultados encontrados: ${results.length}');
      }
      return results;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[NewBookingScreen] Error en búsqueda de direcciones: $e');
      }
      return [];
    }
  }

  void _selectAddressFromAutocomplete(Map<String, dynamic> result, String type) {
    final address = result['display_name'] as String? ?? '';

    // Extraer coordenadas de forma segura (pueden venir como double, num, o String)
    final latValue = result['lat'];
    final lonValue = result['lon'];

    double? lat;
    double? lon;

    if (latValue is double) {
      lat = latValue;
    } else if (latValue is num) {
      lat = latValue.toDouble();
    } else if (latValue is String) {
      lat = double.tryParse(latValue);
    }

    if (lonValue is double) {
      lon = lonValue;
    } else if (lonValue is num) {
      lon = lonValue.toDouble();
    } else if (lonValue is String) {
      lon = double.tryParse(lonValue);
    }

    if (lat == null || lon == null) {
      if (kDebugMode) {
        debugPrint('[NewBookingScreen] ⚠️ Coordenadas inválidas: lat=$latValue, lon=$lonValue');
      }
      return;
    }

    if (kDebugMode) {
      debugPrint('[NewBookingScreen] ✅ Seleccionando dirección: $address');
      debugPrint('[NewBookingScreen] Coordenadas: lat=$lat, lon=$lon');
    }

    final point = LatLng(lat, lon);

    // Obtener el texto actual del usuario antes de reemplazarlo
    final currentText = type == 'origin' ? _originController.text : _destinationController.text;

    // Si el usuario escribió una dirección más completa o detallada que el display_name,
    // mantener su texto original. Esto preserva el formato que el usuario escribió.
    final userTextLower = currentText.toLowerCase().trim();
    final displayNameLower = address.toLowerCase().trim();

    // Comparar si el texto del usuario contiene información más específica
    // Si el texto del usuario es significativamente más largo o contiene más detalles,
    // mantenerlo. De lo contrario, usar el display_name de la API.
    bool shouldKeepUserText = false;

    if (userTextLower.length > displayNameLower.length * 1.2) {
      // El texto del usuario es significativamente más largo
      shouldKeepUserText = true;
    } else if (userTextLower.length > 30 &&
        displayNameLower.contains(userTextLower.substring(0, 20))) {
      // El texto del usuario es largo y el display_name contiene el inicio del texto del usuario
      shouldKeepUserText = true;
    } else if (userTextLower.split(' ').length > displayNameLower.split(' ').length + 2) {
      // El texto del usuario tiene significativamente más palabras
      shouldKeepUserText = true;
    }

    final finalAddress = shouldKeepUserText ? currentText : address;

    if (type == 'origin') {
      _originController.text = finalAddress;
      _originCoords = point;
      _updateOriginMarker(point);
      if (kDebugMode) {
        debugPrint(
          '[NewBookingScreen] ✅ Origen actualizado: ${_originCoords?.latitude}, ${_originCoords?.longitude}',
        );
      }
    } else {
      _destinationController.text = finalAddress;
      _destinationCoords = point;
      _updateDestinationMarker(point);
      if (kDebugMode) {
        debugPrint(
          '[NewBookingScreen] ✅ Destino actualizado: ${_destinationCoords?.latitude}, ${_destinationCoords?.longitude}',
        );
      }
    }

    setState(() {
      _autocompleteResults = [];
      _activeInputType = null; // Cerrar el modo de edición después de seleccionar
    });

    // Forzar actualización del mapa después de actualizar los marcadores
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Actualizar el mapa para mostrar los marcadores
      if (_originCoords != null || _destinationCoords != null) {
        _centerMapOnPoints();
      }

      // Calcular ruta si ambos puntos están establecidos
      if (_originCoords != null && _destinationCoords != null) {
        if (kDebugMode) {
          debugPrint('[NewBookingScreen] 🗺️ Calculando ruta entre origen y destino...');
        }
        _calculateRoute();
      } else if (kDebugMode) {
        debugPrint(
          '[NewBookingScreen] ⏳ Esperando ${type == 'origin' ? 'destino' : 'origen'} para calcular ruta',
        );
      }
    });
  }

  Future<void> _reverseGeocode(LatLng point, TextEditingController controller, String type) async {
    try {
      final response = await http.get(
        Uri.parse(
          'https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.latitude}&lon=${point.longitude}&zoom=18&addressdetails=1',
        ),
        headers: {'Accept': 'application/json', 'User-Agent': 'TaxiApp/1.0'},
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        final address = data['display_name'] as String? ?? '';
        controller.text = address;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error in reverse geocoding: $e');
      }
    }
  }

  Future<void> _calculateRoute() async {
    if (_originCoords == null || _destinationCoords == null) {
      if (kDebugMode) {
        debugPrint(
          '[NewBookingScreen] ⚠️ No se puede calcular ruta: origen=$_originCoords, destino=$_destinationCoords',
        );
      }
      return;
    }

    if (kDebugMode) {
      debugPrint(
        '[NewBookingScreen] 🗺️ Calculando ruta desde ${_originCoords!.latitude},${_originCoords!.longitude} hasta ${_destinationCoords!.latitude},${_destinationCoords!.longitude}',
      );
    }

    try {
      // Calcular distancia directa
      final distance = const Distance();
      final distanceInKm = distance.as(LengthUnit.Kilometer, _originCoords!, _destinationCoords!);
      _distanceController.text = distanceInKm.toStringAsFixed(2);

      if (kDebugMode) {
        debugPrint(
          '[NewBookingScreen] 📏 Distancia directa: ${distanceInKm.toStringAsFixed(2)} km',
        );
      }

      // Intentar obtener ruta real usando OSRM
      try {
        final response = await http
            .get(
              Uri.parse(
                'https://router.project-osrm.org/route/v1/driving/'
                '${_originCoords!.longitude},${_originCoords!.latitude};'
                '${_destinationCoords!.longitude},${_destinationCoords!.latitude}?'
                'overview=full&geometries=geojson',
              ),
              headers: {'Accept': 'application/json'},
            )
            .timeout(const Duration(seconds: 5));

        if (response.statusCode == 200) {
          final data = json.decode(response.body) as Map<String, dynamic>;
          final routes = data['routes'] as List<dynamic>?;
          if (routes != null && routes.isNotEmpty) {
            final route = routes[0] as Map<String, dynamic>;
            final geometry = route['geometry'] as Map<String, dynamic>?;
            final coordinates = geometry?['coordinates'] as List<dynamic>?;

            if (coordinates != null && coordinates.isNotEmpty) {
              final points = coordinates.map((coord) {
                final coordList = coord as List<dynamic>;
                return LatLng(coordList[1] as double, coordList[0] as double);
              }).toList();

              // Actualizar distancia con la ruta real
              final distanceInMeters = (route['distance'] as num?)?.toDouble() ?? 0.0;
              final distanceInKmReal = distanceInMeters / 1000.0;
              _distanceController.text = distanceInKmReal.toStringAsFixed(2);

              setState(() {
                _routePolyline = Polyline(points: points, strokeWidth: 4.0, color: Colors.blue);
              });

              // Recalcular precio usando rutas predefinidas
              _recalculatePriceForVehicleType(forceRecalculate: true);
              _centerMapOnPoints();
              return;
            }
          }
        }
      } catch (e) {
        if (kDebugMode) {
          debugPrint('[NewBookingScreen] Error obteniendo ruta OSRM: $e');
        }
      }

      // Fallback: línea recta si OSRM falla
      // Calcular distancia en línea recta
      const distanceCalculator = Distance();
      final distanceInKmStraight = distanceCalculator.as(
        LengthUnit.Kilometer,
        _originCoords!,
        _destinationCoords!,
      );
      _distanceController.text = distanceInKmStraight.toStringAsFixed(2);

      setState(() {
        _routePolyline = Polyline(
          points: [_originCoords!, _destinationCoords!],
          strokeWidth: 3.0,
          color: Colors.blue,
        );
      });

      // Recalcular precio usando rutas predefinidas (siempre recalcular para asegurar que se muestre)
      await _recalculatePriceForVehicleType(forceRecalculate: true);
      _centerMapOnPoints();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error calculando ruta: $e');
      }
    }
  }

  /// Recalcula el precio basado en la distancia y el tipo de vehículo
  Future<void> _recalculatePriceForVehicleType({bool forceRecalculate = false}) async {
    if (_originCoords == null || _destinationCoords == null) {
      if (kDebugMode) {
        debugPrint('[NewBookingScreen] ⚠️ No se puede calcular precio: origen o destino faltante');
      }
      return;
    }

    // Usar RideCalculationService que incluye rutas predefinidas y lugares con precio fijo
    final price = await RideCalculationService.calculatePriceWithFixedPlaces(
      _originCoords,
      _destinationCoords,
      vehicleType: 'sedan', // Por defecto sedan, puedes ajustar según tu lógica
    );

    if (price != null) {
      if (kDebugMode) {
        debugPrint('[NewBookingScreen] 💰 Precio calculado: $price');
      }
      setState(() {
        _priceController.text = price.toStringAsFixed(2);
      });
    } else {
      // Fallback: calcular basado en distancia si no hay precio predefinido
      final distanceText = _distanceController.text;
      if (distanceText.isNotEmpty) {
        final distanceInKm = double.tryParse(distanceText) ?? 0.0;
        if (distanceInKm > 0) {
          // Precio base por km - solo como fallback
          const pricePerKm = 0.5;
          final calculatedPrice = distanceInKm * pricePerKm;

          // Precio mínimo
          const minPrice = 2.0;
          final finalPrice = calculatedPrice < minPrice ? minPrice : calculatedPrice;

          setState(() {
            _priceController.text = finalPrice.toStringAsFixed(2);
          });
        }
      }
    }
  }

  Future<void> _geocodeAddress(String address, String type) async {
    if (address.trim().length < 3) return;

    if (kDebugMode) {
      debugPrint('[NewBookingScreen] 🔍 Geocodificando dirección: "$address" (type: $type)');
    }

    try {
      // Usar el servicio de autocompletado para buscar la dirección
      final results = await AddressAutocompleteService.searchAddresses(address);

      if (results.isNotEmpty) {
        // Tomar el primer resultado (el más relevante)
        final result = results[0];
        if (kDebugMode) {
          debugPrint('[NewBookingScreen] ✅ Dirección geocodificada: ${result['display_name']}');
        }
        // Seleccionar automáticamente el primer resultado
        _selectAddressFromAutocomplete(result, type);
      } else {
        if (kDebugMode) {
          debugPrint('[NewBookingScreen] ⚠️ No se encontraron resultados para: "$address"');
        }
        // Mostrar mensaje al usuario
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('No se pudo encontrar la dirección: $address'),
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[NewBookingScreen] ❌ Error geocodificando dirección: $e');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al buscar la dirección: $e'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }
}

// Widget personalizado de calendario
class _CustomDatePickerDialog extends StatefulWidget {
  final DateTime initialDate;
  final DateTime firstDate;
  final DateTime lastDate;
  final Function(DateTime) onDateSelected;

  const _CustomDatePickerDialog({
    required this.initialDate,
    required this.firstDate,
    required this.lastDate,
    required this.onDateSelected,
  });

  @override
  State<_CustomDatePickerDialog> createState() => _CustomDatePickerDialogState();
}

class _CustomDatePickerDialogState extends State<_CustomDatePickerDialog> {
  late DateTime _selectedDate;
  late DateTime _currentMonth;
  final List<String> _weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  final List<String> _months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  @override
  void initState() {
    super.initState();
    _selectedDate = widget.initialDate;
    _currentMonth = DateTime(_selectedDate.year, _selectedDate.month, 1);
  }

  List<DateTime> _getDaysInMonth(DateTime month) {
    final firstDay = month;
    final lastDay = DateTime(month.year, month.month + 1, 0);
    final daysInMonth = lastDay.day;
    final firstWeekday = firstDay.weekday;

    final days = <DateTime>[];

    // Agregar días vacíos al inicio
    for (int i = 1; i < firstWeekday; i++) {
      days.add(DateTime(month.year, month.month, 0 - (firstWeekday - i - 1)));
    }

    // Agregar días del mes
    for (int i = 1; i <= daysInMonth; i++) {
      days.add(DateTime(month.year, month.month, i));
    }

    return days;
  }

  void _previousMonth() {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month - 1);
    });
  }

  void _nextMonth() {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month + 1);
    });
  }

  bool _isSameDay(DateTime? a, DateTime? b) {
    if (a == null || b == null) return false;
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  bool _isSelectable(DateTime date) {
    return date.isAfter(widget.firstDate.subtract(const Duration(days: 1))) &&
        date.isBefore(widget.lastDate.add(const Duration(days: 1)));
  }

  @override
  Widget build(BuildContext context) {
    final days = _getDaysInMonth(_currentMonth);
    final now = DateTime.now();

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 320),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: CupertinoColors.systemBackground,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header con mes y año
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  onPressed: _previousMonth,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: CupertinoColors.systemGrey6,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      CupertinoIcons.chevron_left,
                      color: CupertinoColors.systemBlue,
                      size: 18,
                    ),
                  ),
                ),
                Column(
                  children: [
                    Text(
                      _months[_currentMonth.month - 1],
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: CupertinoColors.label,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${_currentMonth.year}',
                      style: TextStyle(
                        fontSize: 14,
                        color: CupertinoColors.secondaryLabel,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
                CupertinoButton(
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  onPressed: _nextMonth,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: CupertinoColors.systemGrey6,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      CupertinoIcons.chevron_right,
                      color: CupertinoColors.systemBlue,
                      size: 18,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Días de la semana
            Row(
              children: _weekDays.map((day) {
                return Expanded(
                  child: Center(
                    child: Text(
                      day,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: CupertinoColors.secondaryLabel,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 8),

            // Calendario
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 7,
                childAspectRatio: 1.0,
                crossAxisSpacing: 4,
                mainAxisSpacing: 4,
              ),
              itemCount: days.length,
              itemBuilder: (context, index) {
                final date = days[index];
                final isCurrentMonth = date.month == _currentMonth.month;
                final isSelected = _isSameDay(date, _selectedDate);
                final isToday = _isSameDay(date, now);
                final isSelectable = _isSelectable(date);

                return CupertinoButton(
                  padding: EdgeInsets.zero,
                  minimumSize: Size.zero,
                  onPressed: isSelectable && isCurrentMonth
                      ? () {
                          setState(() {
                            _selectedDate = date;
                          });
                        }
                      : null,
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: isSelected
                          ? CupertinoColors.systemBlue
                          : isToday && !isSelected
                          ? CupertinoColors.systemBlue.withValues(alpha: 0.1)
                          : Colors.transparent,
                      shape: BoxShape.circle,
                      border: isToday && !isSelected
                          ? Border.all(color: CupertinoColors.systemBlue, width: 1)
                          : null,
                    ),
                    child: Center(
                      child: Text(
                        '${date.day}',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                          color: !isCurrentMonth || !isSelectable
                              ? CupertinoColors.tertiaryLabel
                              : isSelected
                              ? CupertinoColors.white
                              : CupertinoColors.label,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),

            // Botones
            Row(
              children: [
                Expanded(
                  child: CupertinoButton(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    color: CupertinoColors.systemGrey6,
                    borderRadius: BorderRadius.circular(8),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      'Cancelar',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: CupertinoColors.label,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: CupertinoButton(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    color: CupertinoColors.systemBlue,
                    borderRadius: BorderRadius.circular(8),
                    onPressed: () => widget.onDateSelected(_selectedDate),
                    child: const Text(
                      'Seleccionar',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: CupertinoColors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// Widget personalizado de selector de hora
class _CustomTimePickerDialog extends StatefulWidget {
  final TimeOfDay initialTime;
  final Function(TimeOfDay) onTimeSelected;

  const _CustomTimePickerDialog({required this.initialTime, required this.onTimeSelected});

  @override
  State<_CustomTimePickerDialog> createState() => _CustomTimePickerDialogState();
}

class _CustomTimePickerDialogState extends State<_CustomTimePickerDialog> {
  late int _selectedHour;
  late int _selectedMinute;
  bool _isAM = true;

  @override
  void initState() {
    super.initState();
    _selectedHour = widget.initialTime.hourOfPeriod;
    // Validar que el minuto no exceda 59
    _selectedMinute = widget.initialTime.minute.clamp(0, 59);
    _isAM = widget.initialTime.period == DayPeriod.am;
  }

  void _updateHour(int hour) {
    setState(() {
      _selectedHour = hour;
    });
  }

  void _updateMinute(int minute) {
    setState(() {
      _selectedMinute = minute;
    });
  }

  Future<void> _showNumberInputDialog(
    String label,
    int currentValue,
    int min,
    int max,
    Function(int) onChanged,
  ) async {
    final controller = TextEditingController(text: currentValue.toString());

    await showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_kBorderRadius * 2)),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 300),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Editar $label',
                style: GoogleFonts.exo(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: _kTextColor,
                ),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: controller,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                style: GoogleFonts.exo(fontSize: 32, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(_kBorderRadius)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(_kBorderRadius),
                    borderSide: BorderSide(color: _kPrimaryColor, width: 2),
                  ),
                  contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                ),
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        side: BorderSide(color: Colors.grey.shade300),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(_kBorderRadius),
                        ),
                      ),
                      child: Text(
                        'Cancelar',
                        style: GoogleFonts.exo(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () {
                        final value = int.tryParse(controller.text) ?? currentValue;
                        final clampedValue = value.clamp(min, max);
                        onChanged(clampedValue);
                        Navigator.of(context).pop();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _kPrimaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(_kBorderRadius),
                        ),
                      ),
                      child: Text(
                        'Aceptar',
                        style: GoogleFonts.exo(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _togglePeriod() {
    setState(() {
      _isAM = !_isAM;
    });
  }

  TimeOfDay _getSelectedTime() {
    int hour = _selectedHour;
    if (!_isAM && hour != 12) {
      hour += 12;
    } else if (_isAM && hour == 12) {
      hour = 0;
    }
    return TimeOfDay(hour: hour, minute: _selectedMinute);
  }

  Widget _buildNumberPicker({
    required int value,
    required int min,
    required int max,
    int step = 1,
    required Function(int) onChanged,
    required String label,
  }) {
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.exo(
            fontSize: 11,
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 10),
        Container(
          width: 75,
          height: 140,
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200, width: 1),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Botón arriba
              Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: value < max ? () => onChanged(value + step) : null,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(16),
                      topRight: Radius.circular(16),
                    ),
                    child: Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: value < max ? Colors.white : Colors.grey.shade100,
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(16),
                          topRight: Radius.circular(16),
                        ),
                      ),
                      child: Icon(
                        Icons.keyboard_arrow_up_rounded,
                        color: value < max ? _kPrimaryColor : Colors.grey.shade400,
                        size: 28,
                      ),
                    ),
                  ),
                ),
              ),
              // Valor (editable)
              Expanded(
                flex: 2,
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _showNumberInputDialog(label, value, min, max, onChanged),
                    child: Container(
                      width: double.infinity,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        border: Border.symmetric(
                          horizontal: BorderSide(color: Colors.grey.shade200, width: 1),
                        ),
                      ),
                      child: Text(
                        value.toString().padLeft(2, '0'),
                        style: GoogleFonts.exo(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: _kTextColor,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              // Botón abajo
              Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: value > min ? () => onChanged(value - step) : null,
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(16),
                      bottomRight: Radius.circular(16),
                    ),
                    child: Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: value > min ? Colors.white : Colors.grey.shade100,
                        borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(16),
                          bottomRight: Radius.circular(16),
                        ),
                      ),
                      child: Icon(
                        Icons.keyboard_arrow_down_rounded,
                        color: value > min ? _kPrimaryColor : Colors.grey.shade400,
                        size: 28,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPeriodButton(String label, bool isAM) {
    final isSelected = _isAM == isAM;
    return CupertinoButton(
      padding: EdgeInsets.zero,
      minimumSize: Size.zero,
      onPressed: _togglePeriod,
      child: Container(
        width: 50,
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? CupertinoColors.systemBlue : CupertinoColors.systemGrey6,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: isSelected ? CupertinoColors.white : CupertinoColors.label,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 300),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: CupertinoColors.systemBackground,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Título
            Text(
              'Seleccionar hora',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: CupertinoColors.label,
              ),
            ),
            const SizedBox(height: 20),

            // Selector de hora y minutos
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Horas
                _buildNumberPicker(
                  value: _selectedHour,
                  min: 1,
                  max: 12,
                  onChanged: _updateHour,
                  label: 'Hora',
                ),
                const SizedBox(width: 8),

                // Separador
                Padding(
                  padding: const EdgeInsets.only(bottom: 15),
                  child: Text(
                    ':',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w600,
                      color: CupertinoColors.systemBlue,
                      height: 1,
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Minutos
                _buildNumberPicker(
                  value: _selectedMinute,
                  min: 0,
                  max: 59,
                  step: 1,
                  onChanged: _updateMinute,
                  label: 'Minuto',
                ),
                const SizedBox(width: 12),

                // AM/PM
                Column(
                  children: [
                    _buildPeriodButton('AM', true),
                    const SizedBox(height: 6),
                    _buildPeriodButton('PM', false),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Hora seleccionada
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
              decoration: BoxDecoration(
                color: CupertinoColors.systemBlue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                _getSelectedTime().format(context),
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: CupertinoColors.systemBlue,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Botones
            Row(
              children: [
                Expanded(
                  child: CupertinoButton(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    color: CupertinoColors.systemGrey6,
                    borderRadius: BorderRadius.circular(8),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text(
                      'Cancelar',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: CupertinoColors.label,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 2,
                  child: CupertinoButton(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    color: CupertinoColors.systemBlue,
                    borderRadius: BorderRadius.circular(8),
                    onPressed: () => widget.onTimeSelected(_getSelectedTime()),
                    child: const Text(
                      'Seleccionar',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: CupertinoColors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// Custom formatter for time input (HH:mm)
class _TimeInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = newValue.text;

    // Si está vacío, permitir
    if (text.isEmpty) {
      return newValue;
    }

    // Remover todo excepto números y dos puntos
    final cleaned = text.replaceAll(RegExp(r'[^0-9:]'), '');

    // Limitar a 5 caracteres (HH:mm)
    if (cleaned.length > 5) {
      return oldValue;
    }

    // Si solo hay números, formatear automáticamente
    if (!cleaned.contains(':')) {
      if (cleaned.length <= 2) {
        // Solo horas
        return TextEditingValue(
          text: cleaned,
          selection: TextSelection.collapsed(offset: cleaned.length),
        );
      } else if (cleaned.length <= 4) {
        // Horas y minutos sin dos puntos
        final hours = cleaned.substring(0, 2);
        final minutes = cleaned.substring(2);
        return TextEditingValue(
          text: '$hours:$minutes',
          selection: TextSelection.collapsed(offset: '$hours:$minutes'.length),
        );
      }
    }

    // Si ya tiene dos puntos, validar formato
    if (cleaned.contains(':')) {
      final parts = cleaned.split(':');
      if (parts.length > 2) {
        // Más de un dos puntos, mantener el valor anterior
        return oldValue;
      }

      String hours = parts[0];
      String minutes = parts.length > 1 ? parts[1] : '';

      // Validar horas (00-23)
      if (hours.isNotEmpty) {
        final hourInt = int.tryParse(hours);
        if (hourInt != null) {
          if (hourInt > 23) {
            hours = '23';
          } else if (hours.length > 2) {
            hours = hours.substring(0, 2);
          }
        } else {
          hours = '';
        }
      }

      // Validar minutos (00-59)
      if (minutes.isNotEmpty) {
        final minuteInt = int.tryParse(minutes);
        if (minuteInt != null) {
          if (minuteInt > 59) {
            minutes = '59';
          } else if (minutes.length > 2) {
            minutes = minutes.substring(0, 2);
          }
        } else {
          minutes = '';
        }
      }

      final formatted = minutes.isEmpty ? hours : '$hours:$minutes';
      return TextEditingValue(
        text: formatted,
        selection: TextSelection.collapsed(offset: formatted.length),
      );
    }

    return TextEditingValue(
      text: cleaned,
      selection: TextSelection.collapsed(offset: cleaned.length),
    );
  }
}
