import 'package:flutter/material.dart';
import '../../../auth/supabase_service.dart';

class DistanceSlabScreen extends StatefulWidget {
  const DistanceSlabScreen({super.key});

  @override
  State<DistanceSlabScreen> createState() => _DistanceSlabScreenState();
}

class _DistanceSlabScreenState extends State<DistanceSlabScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  String _searchTerm = '';
  int _recordsPerPage = 10;
  int _currentPage = 1;
  List<Map<String, dynamic>> _slabs = [];
  List<Map<String, dynamic>> _filteredSlabs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSlabs();
  }

  Future<void> _loadSlabs() async {
    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      // Intentar cargar desde tabla 'distance_slab'
      try {
        final response = await supabaseClient
            .from('distance_slab')
            .select('*')
            .order('start_distance', ascending: true);

        final slabsList = response as List? ?? [];
        setState(() {
          _slabs = List<Map<String, dynamic>>.from(slabsList);
          _filterSlabs();
        });
      } catch (e) {
        // Si la tabla no existe, usar datos vacíos
        debugPrint('Tabla distance_slab no encontrada: $e');
        setState(() {
          _slabs = [];
          _filteredSlabs = [];
        });
      }
    } catch (e) {
      debugPrint('Error cargando distance slabs: $e');
      if (mounted) {
        final scaffoldMessenger = ScaffoldMessenger.of(context);
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text('Error cargando distance slabs: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _filterSlabs() {
    List<Map<String, dynamic>> filtered = [..._slabs];

    // Filtrar por término de búsqueda
    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered.where((slab) {
        final start = slab['start_distance']?.toString().toLowerCase() ?? '';
        final end = slab['end_distance']?.toString().toLowerCase() ?? '';
        return start.contains(term) || end.contains(term);
      }).toList();
    }

    // Paginación
    final startIndex = (_currentPage - 1) * _recordsPerPage;
    final endIndex = startIndex + _recordsPerPage;
    filtered = filtered.length > startIndex
        ? filtered.sublist(startIndex, endIndex > filtered.length ? filtered.length : endIndex)
        : [];

    setState(() => _filteredSlabs = filtered);
  }

  int get _totalPages {
    final total = _searchTerm.isNotEmpty
        ? _slabs.where((slab) {
            final term = _searchTerm.toLowerCase();
            final start = slab['start_distance']?.toString().toLowerCase() ?? '';
            final end = slab['end_distance']?.toString().toLowerCase() ?? '';
            return start.contains(term) || end.contains(term);
          }).length
        : _slabs.length;
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
                'Mileage Slab',
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
              _filterSlabs();
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
            _filterSlabs();
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
          if (_filteredSlabs.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.straighten, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    Text('No results', style: TextStyle(color: Colors.grey.shade600)),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: _filteredSlabs.length,
                itemBuilder: (context, index) {
                  final slab = _filteredSlabs[index];
                  return _buildTableRow(slab);
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
        child: const Text(
          'Distance Slab Information',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
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
          Expanded(flex: 1, child: _buildHeaderCell('Start Distance')),
          Expanded(flex: 1, child: _buildHeaderCell('End Distance')),
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

  Widget _buildTableRow(Map<String, dynamic> slab) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 1000;

    final startDistance = slab['start_distance'] ?? 0;
    final endDistance = slab['end_distance'] ?? 0;
    final sedan = slab['sedan'] ?? 0.0;
    final sedanBusiness = slab['sedan_business'] ?? 0.0;
    final minivan = slab['minivan'] ?? 0.0;
    final minibus = slab['minibus'] ?? 0.0;

    if (isNarrow) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Start: $startDistance', style: const TextStyle(fontWeight: FontWeight.bold)),
            Text('End: $endDistance'),
            Text('Sedan: ${sedan.toStringAsFixed(2)} EUR'),
            Text('Sedan Business: ${sedanBusiness.toStringAsFixed(2)} EUR'),
            Text('Minivan: ${minivan.toStringAsFixed(2)} EUR'),
            Text('Minibus: ${minibus.toStringAsFixed(2)} EUR'),
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20, color: Color(0xFFFF9800)),
                  onPressed: () => _handleEdit(slab),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20, color: Color(0xFFF44336)),
                  onPressed: () => _handleDelete(slab),
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
          Expanded(flex: 1, child: Text(startDistance.toString())),
          Expanded(flex: 1, child: Text(endDistance.toString())),
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
                  onPressed: () => _handleEdit(slab),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20),
                  color: const Color(0xFFF44336),
                  onPressed: () => _handleDelete(slab),
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
                    _filterSlabs();
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
                    _filterSlabs();
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

  void _handleEdit(Map<String, dynamic> slab) {
    _showEditDialog(slab: slab);
  }

  void _showEditDialog({Map<String, dynamic>? slab}) {
    final isEditing = slab != null;
    final startDistanceController = TextEditingController(
      text: slab?['start_distance']?.toString() ?? '',
    );
    final endDistanceController = TextEditingController(
      text: slab?['end_distance']?.toString() ?? '',
    );
    final sedanController = TextEditingController(text: slab?['sedan']?.toString() ?? '');
    final sedanBusinessController = TextEditingController(
      text: slab?['sedan_business']?.toString() ?? '',
    );
    final minivanController = TextEditingController(text: slab?['minivan']?.toString() ?? '');
    final minibusController = TextEditingController(text: slab?['minibus']?.toString() ?? '');

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
          title: Text(isEditing ? 'Editar Distance Slab' : 'Agregar Distance Slab'),
          content: SingleChildScrollView(
            child: StatefulBuilder(
              builder: (BuildContext context, StateSetter setState) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: startDistanceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Start Distance',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: endDistanceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'End Distance',
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

                  final slabData = {
                    'start_distance': int.tryParse(startDistanceController.text) ?? 0,
                    'end_distance': int.tryParse(endDistanceController.text) ?? 0,
                    'sedan': double.tryParse(sedanController.text) ?? 0.0,
                    'sedan_business': double.tryParse(sedanBusinessController.text) ?? 0.0,
                    'minivan': double.tryParse(minivanController.text) ?? 0.0,
                    'minibus': double.tryParse(minibusController.text) ?? 0.0,
                    'updated_at': DateTime.now().toIso8601String(),
                  };

                  if (isEditing) {
                    // Actualizar
                    await supabaseClient
                        .from('distance_slab')
                        .update(slabData)
                        .eq('id', slab['id']);
                  } else {
                    // Insertar
                    slabData['created_at'] = DateTime.now().toIso8601String();
                    await supabaseClient.from('distance_slab').insert(slabData);
                  }

                  if (!mounted) return;
                  navigator.pop();

                  if (!mounted) return;
                  scaffoldMessenger.showSnackBar(
                    SnackBar(
                      content: Text(
                        isEditing
                            ? 'Distance slab actualizado exitosamente'
                            : 'Distance slab agregado exitosamente',
                      ),
                      backgroundColor: Colors.green,
                    ),
                  );

                  await _loadSlabs();
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

  void _handleDelete(Map<String, dynamic> slab) {
    final start = slab['start_distance'] ?? '';
    final end = slab['end_distance'] ?? '';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Distance Slab'),
        content: Text('¿Estás seguro de que quieres eliminar el slab de $start - $end km?'),
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
                await supabaseClient.from('distance_slab').delete().eq('id', slab['id']);

                if (!mounted) return;
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Distance slab eliminado exitosamente'),
                    backgroundColor: Colors.green,
                  ),
                );

                await _loadSlabs();
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
