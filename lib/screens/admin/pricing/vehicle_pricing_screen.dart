import 'package:flutter/material.dart';
import '../../../auth/supabase_service.dart';

class VehiclePricingScreen extends StatefulWidget {
  const VehiclePricingScreen({super.key});

  @override
  State<VehiclePricingScreen> createState() => _VehiclePricingScreenState();
}

class _VehiclePricingScreenState extends State<VehiclePricingScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  String _searchTerm = '';
  int _recordsPerPage = 10;
  int _currentPage = 1;
  List<Map<String, dynamic>> _vehicles = [];
  List<Map<String, dynamic>> _filteredVehicles = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadVehicles();
  }

  Future<void> _loadVehicles() async {
    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      // Intentar cargar desde tabla 'vehicle_pricing' o 'vehicles'
      try {
        final response = await supabaseClient
            .from('vehicle_pricing')
            .select('*')
            .order('priority', ascending: true);

        final vehiclesList = response as List? ?? [];
        setState(() {
          _vehicles = List<Map<String, dynamic>>.from(vehiclesList);
          _filterVehicles();
        });
      } catch (e) {
        // Si la tabla no existe, usar datos de ejemplo
        debugPrint('Tabla vehicle_pricing no encontrada: $e');
        setState(() {
          _vehicles = [];
          _filteredVehicles = [];
        });
      }
    } catch (e) {
      debugPrint('Error cargando vehículos: $e');
      if (mounted) {
        final scaffoldMessenger = ScaffoldMessenger.of(context);
        scaffoldMessenger.showSnackBar(SnackBar(content: Text('Error cargando vehículos: $e')));
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _filterVehicles() {
    List<Map<String, dynamic>> filtered = [..._vehicles];

    // Filtrar por término de búsqueda
    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered.where((vehicle) {
        final name = vehicle['vehicle_name']?.toString().toLowerCase() ?? '';
        return name.contains(term);
      }).toList();
    }

    // Paginación
    final startIndex = (_currentPage - 1) * _recordsPerPage;
    final endIndex = startIndex + _recordsPerPage;
    filtered = filtered.length > startIndex
        ? filtered.sublist(startIndex, endIndex > filtered.length ? filtered.length : endIndex)
        : [];

    setState(() => _filteredVehicles = filtered);
  }

  int get _totalPages {
    final total = _searchTerm.isNotEmpty
        ? _vehicles.where((vehicle) {
            final term = _searchTerm.toLowerCase();
            final name = vehicle['vehicle_name']?.toString().toLowerCase() ?? '';
            return name.contains(term);
          }).length
        : _vehicles.length;
    return (total / _recordsPerPage).ceil();
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Vehicle Pricing',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1A202C),
                  fontSize: isTablet ? null : 20,
                ),
              ),
              SizedBox(height: isTablet ? 24 : 16),
              _buildControls(isTablet),
              SizedBox(height: isTablet ? 24 : 16),
              Expanded(child: _buildTable()),
              SizedBox(height: isTablet ? 16 : 12),
              if (_totalPages > 1) _buildPagination(),
              _buildAddNewButton(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildControls(bool isTablet) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 500;

        if (isNarrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [_buildRecordsDropdown(), const SizedBox(height: 12), _buildSearchField()],
          );
        }

        return Row(
          children: [
            SizedBox(width: 150, child: _buildRecordsDropdown()),
            const SizedBox(width: 12),
            Expanded(child: _buildSearchField()),
          ],
        );
      },
    );
  }

  Widget _buildRecordsDropdown() {
    return Material(
      elevation: 0,
      color: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12.0),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8.0),
        ),
        child: DropdownButton<int>(
          value: _recordsPerPage,
          underline: const SizedBox(),
          isExpanded: true,
          items: [10, 25, 50]
              .map(
                (int value) => DropdownMenuItem<int>(value: value, child: Text('$value Records')),
              )
              .toList(),
          onChanged: (newValue) {
            setState(() {
              _recordsPerPage = newValue!;
              _currentPage = 1;
              _filterVehicles();
            });
          },
        ),
      ),
    );
  }

  Widget _buildSearchField() {
    return Material(
      elevation: 0,
      color: Colors.transparent,
      child: TextField(
        decoration: const InputDecoration(
          hintText: 'Search',
          border: OutlineInputBorder(),
          contentPadding: EdgeInsets.symmetric(horizontal: 12.0),
          suffixIcon: Icon(Icons.search),
        ),
        onChanged: (value) {
          setState(() {
            _searchTerm = value;
            _currentPage = 1;
            _filterVehicles();
          });
        },
      ),
    );
  }

  Widget _buildTable() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_filteredVehicles.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.directions_car, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text('No hay vehículos disponibles', style: TextStyle(color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildTableHeader(),
          Expanded(
            child: ListView.builder(
              itemCount: _filteredVehicles.length,
              itemBuilder: (context, index) {
                final vehicle = _filteredVehicles[index];
                final displayNumber = (_currentPage - 1) * _recordsPerPage + index + 1;
                return _buildTableRow(vehicle, displayNumber);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTableHeader() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 800;

    if (isNarrow) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
        ),
        child: const Text('Vehicle Information', style: TextStyle(fontWeight: FontWeight.bold)),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Row(
        children: [
          SizedBox(width: 80, child: _buildHeaderCell('Priority')),
          Expanded(flex: 2, child: _buildHeaderCell('Vehicle Name')),
          Expanded(flex: 1, child: _buildHeaderCell('Passengers')),
          Expanded(flex: 1, child: _buildHeaderCell('Small Luggage')),
          Expanded(flex: 1, child: _buildHeaderCell('Large Luggage')),
          Expanded(flex: 1, child: _buildHeaderCell('Child Seat')),
          Expanded(flex: 1, child: _buildHeaderCell('Price')),
          Expanded(flex: 1, child: _buildHeaderCell('')),
        ],
      ),
    );
  }

  Widget _buildHeaderCell(String text) {
    return Text(
      text,
      style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF374151)),
    );
  }

  Widget _buildTableRow(Map<String, dynamic> vehicle, int number) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 800;

    final priority = vehicle['priority'] ?? 0;
    final vehicleName = vehicle['vehicle_name'] ?? 'N/A';
    final passengers = vehicle['passengers'] ?? 0;
    final smallLuggage = vehicle['small_luggage'] ?? 0;
    final largeLuggage = vehicle['large_luggage'] ?? 0;
    final childSeat = vehicle['child_seat'] ?? 0;
    final price = vehicle['price'] ?? 0.0;

    if (isNarrow) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$number. $vehicleName', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('Priority: $priority'),
            Text('Passengers: $passengers'),
            Text('Small Luggage: $smallLuggage'),
            Text('Large Luggage: $largeLuggage'),
            Text('Child Seat: $childSeat'),
            Text('Price: ${price.toStringAsFixed(2)} EUR'),
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20, color: Color(0xFFFF9800)),
                  onPressed: () => _handleEdit(vehicle),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20, color: Color(0xFFF44336)),
                  onPressed: () => _handleDelete(vehicle),
                  tooltip: 'Eliminar',
                ),
              ],
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      child: Row(
        children: [
          SizedBox(width: 80, child: Text(priority.toString())),
          Expanded(flex: 2, child: Text(vehicleName.toString())),
          Expanded(flex: 1, child: Text(passengers.toString())),
          Expanded(flex: 1, child: Text(smallLuggage.toString())),
          Expanded(flex: 1, child: Text(largeLuggage.toString())),
          Expanded(flex: 1, child: Text(childSeat.toString())),
          Expanded(flex: 1, child: Text('${price.toStringAsFixed(2)} EUR')),
          Expanded(
            flex: 1,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20),
                  color: const Color(0xFFFF9800),
                  onPressed: () => _handleEdit(vehicle),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20),
                  color: const Color(0xFFF44336),
                  onPressed: () => _handleDelete(vehicle),
                  tooltip: 'Eliminar',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPagination() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        TextButton(
          onPressed: _currentPage > 1
              ? () {
                  setState(() {
                    _currentPage--;
                    _filterVehicles();
                  });
                }
              : null,
          child: const Text('Anterior'),
        ),
        const SizedBox(width: 16),
        Text('Página $_currentPage de $_totalPages'),
        const SizedBox(width: 16),
        TextButton(
          onPressed: _currentPage < _totalPages
              ? () {
                  setState(() {
                    _currentPage++;
                    _filterVehicles();
                  });
                }
              : null,
          child: const Text('Siguiente'),
        ),
      ],
    );
  }

  Widget _buildAddNewButton() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF2563EB),
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          onPressed: () => _handleAddNew(),
          child: const Text(
            'Add New',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  void _handleAddNew() {
    _showEditDialog();
  }

  void _handleEdit(Map<String, dynamic> vehicle) {
    _showEditDialog(vehicle: vehicle);
  }

  void _showEditDialog({Map<String, dynamic>? vehicle}) {
    final isEditing = vehicle != null;
    final priorityController = TextEditingController(text: vehicle?['priority']?.toString() ?? '');
    final vehicleNameController = TextEditingController(text: vehicle?['vehicle_name'] ?? '');
    final passengersController = TextEditingController(
      text: vehicle?['passengers']?.toString() ?? '',
    );
    final smallLuggageController = TextEditingController(
      text: vehicle?['small_luggage']?.toString() ?? '',
    );
    final largeLuggageController = TextEditingController(
      text: vehicle?['large_luggage']?.toString() ?? '',
    );
    final childSeatController = TextEditingController(
      text: vehicle?['child_seat']?.toString() ?? '',
    );
    final priceController = TextEditingController(text: vehicle?['price']?.toString() ?? '');

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
          title: Text(isEditing ? 'Editar Vehículo' : 'Agregar Vehículo'),
          content: SingleChildScrollView(
            child: StatefulBuilder(
              builder: (BuildContext context, StateSetter setState) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: priorityController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Priority',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: vehicleNameController,
                      decoration: const InputDecoration(
                        labelText: 'Vehicle Name',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: passengersController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Passengers',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: smallLuggageController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Small Luggage',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: largeLuggageController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Large Luggage',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: childSeatController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Child Seat',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: priceController,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Price',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
              child: Text(
                isEditing ? 'Actualizar' : 'Agregar',
                style: const TextStyle(color: Colors.white),
              ),
              onPressed: () async {
                if (!mounted) return;
                final navigator = Navigator.of(context);
                final scaffoldMessenger = ScaffoldMessenger.of(context);

                try {
                  final supabaseClient = _supabaseService.client;

                  final vehicleData = {
                    'priority': int.tryParse(priorityController.text) ?? 0,
                    'vehicle_name': vehicleNameController.text,
                    'passengers': int.tryParse(passengersController.text) ?? 0,
                    'small_luggage': int.tryParse(smallLuggageController.text) ?? 0,
                    'large_luggage': int.tryParse(largeLuggageController.text) ?? 0,
                    'child_seat': int.tryParse(childSeatController.text) ?? 0,
                    'price': double.tryParse(priceController.text) ?? 0.0,
                    'updated_at': DateTime.now().toIso8601String(),
                  };

                  if (isEditing) {
                    // Actualizar
                    await supabaseClient
                        .from('vehicle_pricing')
                        .update(vehicleData)
                        .eq('id', vehicle['id']);
                  } else {
                    // Insertar
                    vehicleData['created_at'] = DateTime.now().toIso8601String();
                    await supabaseClient.from('vehicle_pricing').insert(vehicleData);
                  }

                  if (!mounted) return;
                  navigator.pop();

                  if (!mounted) return;
                  scaffoldMessenger.showSnackBar(
                    SnackBar(
                      content: Text(
                        isEditing
                            ? 'Vehículo actualizado exitosamente'
                            : 'Vehículo agregado exitosamente',
                      ),
                      backgroundColor: Colors.green,
                    ),
                  );

                  await _loadVehicles();
                } catch (e) {
                  if (!mounted) return;
                  navigator.pop();

                  if (!mounted) return;
                  scaffoldMessenger.showSnackBar(
                    SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
                  );
                }
              },
            ),
          ],
        );
      },
    );
  }

  void _handleDelete(Map<String, dynamic> vehicle) {
    final vehicleName = vehicle['vehicle_name'] ?? 'este vehículo';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Vehículo'),
        content: Text('¿Estás seguro de que quieres eliminar $vehicleName?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          TextButton(
            onPressed: () async {
              if (!mounted) return;
              final navigator = Navigator.of(context);
              final scaffoldMessenger = ScaffoldMessenger.of(context);

              try {
                navigator.pop();

                final supabaseClient = _supabaseService.client;
                await supabaseClient.from('vehicle_pricing').delete().eq('id', vehicle['id']);

                if (!mounted) return;
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Vehículo eliminado exitosamente'),
                    backgroundColor: Colors.green,
                  ),
                );

                await _loadVehicles();
              } catch (e) {
                if (!mounted) return;
                scaffoldMessenger.showSnackBar(
                  SnackBar(content: Text('Error al eliminar: $e'), backgroundColor: Colors.red),
                );
              }
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
  }
}
