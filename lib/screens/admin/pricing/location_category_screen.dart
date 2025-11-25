import 'package:flutter/material.dart';
import '../../../auth/supabase_service.dart';

class LocationCategoryScreen extends StatefulWidget {
  const LocationCategoryScreen({super.key});

  @override
  State<LocationCategoryScreen> createState() => _LocationCategoryScreenState();
}

class _LocationCategoryScreenState extends State<LocationCategoryScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  final _formKey = GlobalKey<FormState>();

  final _pickUpAirportController = TextEditingController(text: '0');
  final _meetGreetAirportController = TextEditingController(text: '0');

  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _loadLocationCategory();
  }

  @override
  void dispose() {
    _pickUpAirportController.dispose();
    _meetGreetAirportController.dispose();
    super.dispose();
  }

  Future<void> _loadLocationCategory() async {
    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      // Intentar cargar desde tabla 'location_category_pricing'
      try {
        final response = await supabaseClient
            .from('location_category_pricing')
            .select('*')
            .eq('key', 'airport')
            .maybeSingle();

        if (response != null) {
          final data = Map<String, dynamic>.from(response);
          final config = data['config'] as Map<String, dynamic>? ?? {};

          setState(() {
            _pickUpAirportController.text = config['pick_up_airport']?.toString() ?? '0';
            _meetGreetAirportController.text = config['meet_greet_airport']?.toString() ?? '0';
          });
        }
      } catch (e) {
        // Si la tabla no existe, usar valores por defecto
        debugPrint('Tabla location_category_pricing no encontrada, usando valores por defecto: $e');
      }
    } catch (e) {
      debugPrint('Error cargando location category: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _saveLocationCategory() async {
    if (!_formKey.currentState!.validate()) return;

    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      // Preparar datos de configuración
      final config = {
        'pick_up_airport': double.tryParse(_pickUpAirportController.text) ?? 0.0,
        'meet_greet_airport': double.tryParse(_meetGreetAirportController.text) ?? 0.0,
        'updated_at': DateTime.now().toIso8601String(),
      };

      // Intentar actualizar o insertar en tabla 'location_category_pricing'
      try {
        // Verificar si ya existe un registro con key='airport'
        final existing = await supabaseClient
            .from('location_category_pricing')
            .select('id')
            .eq('key', 'airport')
            .maybeSingle();

        if (existing != null) {
          // Actualizar registro existente
          await supabaseClient
              .from('location_category_pricing')
              .update({'config': config, 'updated_at': DateTime.now().toIso8601String()})
              .eq('key', 'airport');
        } else {
          // Insertar nuevo registro
          await supabaseClient.from('location_category_pricing').insert({
            'key': 'airport',
            'config': config,
            'created_at': DateTime.now().toIso8601String(),
            'updated_at': DateTime.now().toIso8601String(),
          });
        }
      } catch (e) {
        // Si hay error, lanzarlo para que se maneje en el catch externo
        debugPrint('Error guardando location_category_pricing: $e');
        rethrow;
      }

      if (!mounted) return;
      final scaffoldMessenger = ScaffoldMessenger.of(context);
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text('Configuración de location category actualizada exitosamente'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      final scaffoldMessenger = ScaffoldMessenger.of(context);
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Error al actualizar: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth > 600;

    return Material(
      color: Colors.white,
      child: Container(
        color: Colors.white,
        child: Padding(
          padding: EdgeInsets.all(isTablet ? 24.0 : 16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Location Category Pricing',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF1A202C),
                    fontSize: isTablet ? null : 20,
                  ),
                ),
                Container(
                  margin: const EdgeInsets.only(top: 8, bottom: 24),
                  height: 1,
                  color: Colors.grey.shade300,
                ),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSection(
                          title: 'Pick Up',
                          children: [
                            _buildCurrencyField(
                              label: 'Airport',
                              controller: _pickUpAirportController,
                            ),
                          ],
                        ),
                        const SizedBox(height: 32),
                        _buildSection(
                          title: 'Meet & Greet',
                          children: [
                            _buildCurrencyField(
                              label: 'Airport',
                              controller: _meetGreetAirportController,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 250,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _loading ? null : _saveLocationCategory,
                        child: _loading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Text(
                                'UPDATE',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection({required String title, required List<Widget> children}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1A202C),
          ),
        ),
        const SizedBox(height: 16),
        ...children,
      ],
    );
  }

  Widget _buildCurrencyField({required String label, required TextEditingController controller}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(
          width: 250,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF1A202C),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        const SizedBox(width: 16),
        Row(
          children: [
            SizedBox(
              width: 250,
              child: TextFormField(
                controller: controller,
                keyboardType: TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  isDense: true,
                ),
                style: const TextStyle(fontSize: 14),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Este campo es requerido';
                  }
                  if (double.tryParse(value) == null) {
                    return 'Ingrese un número válido';
                  }
                  return null;
                },
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: const Text(
                'EUR',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF1A202C),
                  fontSize: 14,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
