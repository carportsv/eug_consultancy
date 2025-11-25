import 'package:flutter/material.dart';
import '../../../auth/supabase_service.dart';

class HourlyPackagesScreen extends StatefulWidget {
  const HourlyPackagesScreen({super.key});

  @override
  State<HourlyPackagesScreen> createState() => _HourlyPackagesScreenState();
}

class _HourlyPackagesScreenState extends State<HourlyPackagesScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  String _searchTerm = '';
  int _recordsPerPage = 10;
  int _currentPage = 1;
  List<Map<String, dynamic>> _packages = [];
  List<Map<String, dynamic>> _filteredPackages = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPackages();
  }

  Future<void> _loadPackages() async {
    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      // Intentar cargar desde tabla 'hourly_packages'
      try {
        final response = await supabaseClient
            .from('hourly_packages')
            .select('*')
            .order('distance', ascending: true);

        final packagesList = response as List? ?? [];
        setState(() {
          _packages = List<Map<String, dynamic>>.from(packagesList);
          _filterPackages();
        });
      } catch (e) {
        // Si la tabla no existe, usar datos vacíos
        debugPrint('Tabla hourly_packages no encontrada: $e');
        setState(() {
          _packages = [];
          _filteredPackages = [];
        });
      }
    } catch (e) {
      debugPrint('Error cargando paquetes horarios: $e');
      if (mounted) {
        final scaffoldMessenger = ScaffoldMessenger.of(context);
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text('Error cargando paquetes horarios: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _filterPackages() {
    List<Map<String, dynamic>> filtered = [..._packages];

    // Filtrar por término de búsqueda
    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered.where((pkg) {
        final distance = pkg['distance']?.toString().toLowerCase() ?? '';
        final hours = pkg['hours']?.toString().toLowerCase() ?? '';
        return distance.contains(term) || hours.contains(term);
      }).toList();
    }

    // Paginación
    final startIndex = (_currentPage - 1) * _recordsPerPage;
    final endIndex = startIndex + _recordsPerPage;
    filtered = filtered.length > startIndex
        ? filtered.sublist(startIndex, endIndex > filtered.length ? filtered.length : endIndex)
        : [];

    setState(() => _filteredPackages = filtered);
  }

  int get _totalPages {
    final total = _searchTerm.isNotEmpty
        ? _packages.where((pkg) {
            final term = _searchTerm.toLowerCase();
            final distance = pkg['distance']?.toString().toLowerCase() ?? '';
            final hours = pkg['hours']?.toString().toLowerCase() ?? '';
            return distance.contains(term) || hours.contains(term);
          }).length
        : _packages.length;
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
                'Hourly Package',
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
              _filterPackages();
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
            _filterPackages();
          });
        },
      ),
    );
  }

  Widget _buildTable() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
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
          if (_filteredPackages.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.access_time, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    Text('No results', style: TextStyle(color: Colors.grey.shade600)),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: _filteredPackages.length,
                itemBuilder: (context, index) {
                  final package = _filteredPackages[index];
                  return _buildTableRow(package);
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTableHeader() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 1000;

    if (isNarrow) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
        ),
        child: const Text('Package Information', style: TextStyle(fontWeight: FontWeight.bold)),
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
          Expanded(flex: 1, child: _buildHeaderCell('Distance')),
          Expanded(flex: 1, child: _buildHeaderCell('Hours')),
          Expanded(flex: 1, child: _buildHeaderCell('Sedan')),
          Expanded(flex: 1, child: _buildHeaderCell('Sedan Bussines')),
          Expanded(flex: 1, child: _buildHeaderCell('Minivan')),
          Expanded(flex: 1, child: _buildHeaderCell('Minibus')),
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

  Widget _buildTableRow(Map<String, dynamic> package) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 1000;

    final distance = package['distance'] ?? 0;
    final hours = package['hours'] ?? 0;
    final sedan = package['sedan'] ?? 0.0;
    final sedanBusiness = package['sedan_business'] ?? 0.0;
    final minivan = package['minivan'] ?? 0.0;
    final minibus = package['minibus'] ?? 0.0;

    if (isNarrow) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Distance: $distance', style: const TextStyle(fontWeight: FontWeight.bold)),
            Text('Hours: $hours'),
            Text('Sedan: ${sedan.toStringAsFixed(2)} EUR'),
            Text('Sedan Business: ${sedanBusiness.toStringAsFixed(2)} EUR'),
            Text('Minivan: ${minivan.toStringAsFixed(2)} EUR'),
            Text('Minibus: ${minibus.toStringAsFixed(2)} EUR'),
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20, color: Color(0xFFFF9800)),
                  onPressed: () => _handleEdit(package),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20, color: Color(0xFFF44336)),
                  onPressed: () => _handleDelete(package),
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
          Expanded(flex: 1, child: Text(distance.toString())),
          Expanded(flex: 1, child: Text(hours.toString())),
          Expanded(flex: 1, child: Text('${sedan.toStringAsFixed(2)} EUR')),
          Expanded(flex: 1, child: Text('${sedanBusiness.toStringAsFixed(2)} EUR')),
          Expanded(flex: 1, child: Text('${minivan.toStringAsFixed(2)} EUR')),
          Expanded(flex: 1, child: Text('${minibus.toStringAsFixed(2)} EUR')),
          Expanded(
            flex: 1,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20),
                  color: const Color(0xFFFF9800),
                  onPressed: () => _handleEdit(package),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20),
                  color: const Color(0xFFF44336),
                  onPressed: () => _handleDelete(package),
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
                    _filterPackages();
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
                    _filterPackages();
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

  void _handleEdit(Map<String, dynamic> package) {
    _showEditDialog(package: package);
  }

  void _showEditDialog({Map<String, dynamic>? package}) {
    final isEditing = package != null;
    final distanceController = TextEditingController(text: package?['distance']?.toString() ?? '');
    final hoursController = TextEditingController(text: package?['hours']?.toString() ?? '');
    final sedanController = TextEditingController(text: package?['sedan']?.toString() ?? '');
    final sedanBusinessController = TextEditingController(
      text: package?['sedan_business']?.toString() ?? '',
    );
    final minivanController = TextEditingController(text: package?['minivan']?.toString() ?? '');
    final minibusController = TextEditingController(text: package?['minibus']?.toString() ?? '');

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
          title: Text(isEditing ? 'Editar Paquete Horario' : 'Agregar Paquete Horario'),
          content: SingleChildScrollView(
            child: StatefulBuilder(
              builder: (BuildContext context, StateSetter setState) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: distanceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Distance',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: hoursController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Hours',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: sedanController,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Sedan (EUR)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: sedanBusinessController,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Sedan Business (EUR)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: minivanController,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Minivan (EUR)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: minibusController,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Minibus (EUR)',
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

                  final packageData = {
                    'distance': int.tryParse(distanceController.text) ?? 0,
                    'hours': int.tryParse(hoursController.text) ?? 0,
                    'sedan': double.tryParse(sedanController.text) ?? 0.0,
                    'sedan_business': double.tryParse(sedanBusinessController.text) ?? 0.0,
                    'minivan': double.tryParse(minivanController.text) ?? 0.0,
                    'minibus': double.tryParse(minibusController.text) ?? 0.0,
                    'updated_at': DateTime.now().toIso8601String(),
                  };

                  if (isEditing) {
                    // Actualizar
                    await supabaseClient
                        .from('hourly_packages')
                        .update(packageData)
                        .eq('id', package['id']);
                  } else {
                    // Insertar
                    packageData['created_at'] = DateTime.now().toIso8601String();
                    await supabaseClient.from('hourly_packages').insert(packageData);
                  }

                  if (!mounted) return;
                  navigator.pop();

                  if (!mounted) return;
                  scaffoldMessenger.showSnackBar(
                    SnackBar(
                      content: Text(
                        isEditing
                            ? 'Paquete horario actualizado exitosamente'
                            : 'Paquete horario agregado exitosamente',
                      ),
                      backgroundColor: Colors.green,
                    ),
                  );

                  await _loadPackages();
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

  void _handleDelete(Map<String, dynamic> package) {
    final distance = package['distance'] ?? '';
    final hours = package['hours'] ?? '';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Paquete Horario'),
        content: Text(
          '¿Estás seguro de que quieres eliminar el paquete de $distance km / $hours horas?',
        ),
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
                await supabaseClient.from('hourly_packages').delete().eq('id', package['id']);

                if (!mounted) return;
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Paquete horario eliminado exitosamente'),
                    backgroundColor: Colors.green,
                  ),
                );

                await _loadPackages();
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
