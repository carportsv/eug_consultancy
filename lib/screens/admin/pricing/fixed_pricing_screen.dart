import 'package:flutter/material.dart';
import '../../../auth/supabase_service.dart';

class FixedPricingScreen extends StatefulWidget {
  const FixedPricingScreen({super.key});

  @override
  State<FixedPricingScreen> createState() => _FixedPricingScreenState();
}

class _FixedPricingScreenState extends State<FixedPricingScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  String _searchTerm = '';
  int _recordsPerPage = 100;
  int _currentPage = 1;
  List<Map<String, dynamic>> _fixedPrices = [];
  List<Map<String, dynamic>> _filteredFixedPrices = [];
  bool _loading = true;
  final _globalPriceAdjustController = TextEditingController(text: '0');
  String _sortColumn = 'pick_up';
  bool _sortAscending = true;

  @override
  void initState() {
    super.initState();
    _loadFixedPrices();
  }

  @override
  void dispose() {
    _globalPriceAdjustController.dispose();
    super.dispose();
  }

  Future<void> _loadFixedPrices() async {
    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      // Intentar cargar desde tabla 'fixed_pricing'
      try {
        final response = await supabaseClient
            .from('fixed_pricing')
            .select('*')
            .order('pick_up', ascending: true);

        final pricesList = response as List? ?? [];
        setState(() {
          _fixedPrices = List<Map<String, dynamic>>.from(pricesList);
          _sortFixedPrices();
          _filterFixedPrices();
        });
      } catch (e) {
        // Si la tabla no existe, usar datos vacíos
        debugPrint('Tabla fixed_pricing no encontrada: $e');
        setState(() {
          _fixedPrices = [];
          _filteredFixedPrices = [];
        });
      }
    } catch (e) {
      debugPrint('Error cargando precios fijos: $e');
      if (mounted) {
        final scaffoldMessenger = ScaffoldMessenger.of(context);
        scaffoldMessenger.showSnackBar(SnackBar(content: Text('Error cargando precios fijos: $e')));
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _sortFixedPrices() {
    _fixedPrices.sort((a, b) {
      int comparison = 0;
      if (_sortColumn == 'pick_up') {
        final aVal = (a['pick_up'] ?? '').toString().toLowerCase();
        final bVal = (b['pick_up'] ?? '').toString().toLowerCase();
        comparison = aVal.compareTo(bVal);
      } else if (_sortColumn == 'drop_off') {
        final aVal = (a['drop_off'] ?? '').toString().toLowerCase();
        final bVal = (b['drop_off'] ?? '').toString().toLowerCase();
        comparison = aVal.compareTo(bVal);
      } else if (_sortColumn == 'price') {
        final aVal = (a['price'] ?? 0.0) as double;
        final bVal = (b['price'] ?? 0.0) as double;
        comparison = aVal.compareTo(bVal);
      }
      return _sortAscending ? comparison : -comparison;
    });
  }

  void _filterFixedPrices() {
    List<Map<String, dynamic>> filtered = [..._fixedPrices];

    // Filtrar por término de búsqueda
    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered.where((price) {
        final pickUp = price['pick_up']?.toString().toLowerCase() ?? '';
        final dropOff = price['drop_off']?.toString().toLowerCase() ?? '';
        return pickUp.contains(term) || dropOff.contains(term);
      }).toList();
    }

    // Paginación
    final startIndex = (_currentPage - 1) * _recordsPerPage;
    final endIndex = startIndex + _recordsPerPage;
    filtered = filtered.length > startIndex
        ? filtered.sublist(startIndex, endIndex > filtered.length ? filtered.length : endIndex)
        : [];

    setState(() => _filteredFixedPrices = filtered);
  }

  void _handleSort(String column) {
    setState(() {
      if (_sortColumn == column) {
        _sortAscending = !_sortAscending;
      } else {
        _sortColumn = column;
        _sortAscending = true;
      }
      _sortFixedPrices();
      _filterFixedPrices();
    });
  }

  int get _totalPages {
    final total = _searchTerm.isNotEmpty
        ? _fixedPrices.where((price) {
            final term = _searchTerm.toLowerCase();
            final pickUp = price['pick_up']?.toString().toLowerCase() ?? '';
            final dropOff = price['drop_off']?.toString().toLowerCase() ?? '';
            return pickUp.contains(term) || dropOff.contains(term);
          }).length
        : _fixedPrices.length;
    return (total / _recordsPerPage).ceil();
  }

  Future<void> _updateAllPrices() async {
    final adjustment = double.tryParse(_globalPriceAdjustController.text) ?? 0.0;
    if (adjustment == 0.0) {
      if (!mounted) return;
      final scaffoldMessenger = ScaffoldMessenger.of(context);
      scaffoldMessenger.showSnackBar(
        const SnackBar(
          content: Text('Ingrese un valor diferente de 0'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      // Actualizar todos los precios
      for (final price in _fixedPrices) {
        final currentPrice = (price['price'] ?? 0.0) as double;
        final newPrice = (currentPrice + adjustment).clamp(0.0, double.infinity);

        await supabaseClient
            .from('fixed_pricing')
            .update({'price': newPrice, 'updated_at': DateTime.now().toIso8601String()})
            .eq('id', price['id']);
      }

      if (!mounted) return;
      final scaffoldMessenger = ScaffoldMessenger.of(context);
      scaffoldMessenger.showSnackBar(
        SnackBar(
          content: Text(
            adjustment > 0
                ? 'Todos los precios aumentados en ${adjustment.toStringAsFixed(2)} EUR'
                : 'Todos los precios disminuidos en ${adjustment.abs().toStringAsFixed(2)} EUR',
          ),
          backgroundColor: Colors.green,
        ),
      );

      _globalPriceAdjustController.text = '0';
      await _loadFixedPrices();
    } catch (e) {
      if (!mounted) return;
      final scaffoldMessenger = ScaffoldMessenger.of(context);
      scaffoldMessenger.showSnackBar(
        SnackBar(content: Text('Error al actualizar precios: $e'), backgroundColor: Colors.red),
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Fixed Pricing',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1A202C),
                  fontSize: isTablet ? null : 20,
                ),
              ),
              SizedBox(height: isTablet ? 24 : 16),
              _buildGlobalPriceAdjustment(),
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

  Widget _buildGlobalPriceAdjustment() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(
          width: 250,
          child: Text(
            'Increase/Decrease All Fixed Prices',
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
                controller: _globalPriceAdjustController,
                keyboardType: TextInputType.numberWithOptions(decimal: true, signed: true),
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  isDense: true,
                ),
                style: const TextStyle(fontSize: 14),
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
            const SizedBox(width: 8),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: _loading ? null : _updateAllPrices,
              child: const Text(
                'Update',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ],
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
          items: [10, 25, 50, 100]
              .map(
                (int value) => DropdownMenuItem<int>(value: value, child: Text('$value Records')),
              )
              .toList(),
          onChanged: (newValue) {
            setState(() {
              _recordsPerPage = newValue!;
              _currentPage = 1;
              _filterFixedPrices();
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
            _filterFixedPrices();
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
          if (_filteredFixedPrices.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.route, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    Text('No results', style: TextStyle(color: Colors.grey.shade600)),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: _filteredFixedPrices.length,
                itemBuilder: (context, index) {
                  final price = _filteredFixedPrices[index];
                  return _buildTableRow(price);
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
        child: const Text(
          'Fixed Pricing Information',
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
          Expanded(
            flex: 3,
            child: InkWell(
              onTap: () => _handleSort('pick_up'),
              child: Row(
                children: [
                  _buildHeaderCell('Pick Up'),
                  const SizedBox(width: 4),
                  Icon(
                    _sortColumn == 'pick_up'
                        ? (_sortAscending ? Icons.arrow_upward : Icons.arrow_downward)
                        : Icons.unfold_more,
                    size: 16,
                    color: Colors.grey.shade600,
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: InkWell(
              onTap: () => _handleSort('drop_off'),
              child: Row(
                children: [
                  _buildHeaderCell('Drop Off'),
                  const SizedBox(width: 4),
                  Icon(
                    _sortColumn == 'drop_off'
                        ? (_sortAscending ? Icons.arrow_upward : Icons.arrow_downward)
                        : Icons.unfold_more,
                    size: 16,
                    color: Colors.grey.shade600,
                  ),
                ],
              ),
            ),
          ),
          Expanded(flex: 2, child: _buildHeaderCell('Price (EUR)')),
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

  Widget _buildTableRow(Map<String, dynamic> price) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 800;

    final pickUp = price['pick_up'] ?? 'N/A';
    final dropOff = price['drop_off'] ?? 'N/A';
    final priceValue = price['price'] ?? 0.0;

    if (isNarrow) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Pick Up: $pickUp', style: const TextStyle(fontWeight: FontWeight.bold)),
            Text('Drop Off: $dropOff'),
            Text('Price: ${priceValue.toStringAsFixed(2)} EUR'),
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20, color: Color(0xFFFF9800)),
                  onPressed: () => _handleEdit(price),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20, color: Color(0xFFF44336)),
                  onPressed: () => _handleDelete(price),
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
          Expanded(flex: 3, child: Text(pickUp.toString())),
          Expanded(flex: 3, child: Text(dropOff.toString())),
          Expanded(flex: 2, child: Text('${priceValue.toStringAsFixed(2)}')),
          Expanded(
            flex: 1,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20),
                  color: const Color(0xFFFF9800),
                  onPressed: () => _handleEdit(price),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20),
                  color: const Color(0xFFF44336),
                  onPressed: () => _handleDelete(price),
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
                    _filterFixedPrices();
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
                    _filterFixedPrices();
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

  void _handleEdit(Map<String, dynamic> price) {
    _showEditDialog(price: price);
  }

  void _showEditDialog({Map<String, dynamic>? price}) {
    final isEditing = price != null;
    final pickUpController = TextEditingController(text: price?['pick_up'] ?? '');
    final dropOffController = TextEditingController(text: price?['drop_off'] ?? '');
    final priceController = TextEditingController(text: price?['price']?.toString() ?? '');

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
          title: Text(isEditing ? 'Editar Precio Fijo' : 'Agregar Precio Fijo'),
          content: SingleChildScrollView(
            child: StatefulBuilder(
              builder: (BuildContext context, StateSetter setState) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: pickUpController,
                      decoration: const InputDecoration(
                        labelText: 'Pick Up',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: dropOffController,
                      decoration: const InputDecoration(
                        labelText: 'Drop Off',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: priceController,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Price (EUR)',
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

                  final priceData = {
                    'pick_up': pickUpController.text,
                    'drop_off': dropOffController.text,
                    'price': double.tryParse(priceController.text) ?? 0.0,
                    'updated_at': DateTime.now().toIso8601String(),
                  };

                  if (isEditing) {
                    // Actualizar
                    await supabaseClient
                        .from('fixed_pricing')
                        .update(priceData)
                        .eq('id', price['id']);
                  } else {
                    // Insertar
                    priceData['created_at'] = DateTime.now().toIso8601String();
                    await supabaseClient.from('fixed_pricing').insert(priceData);
                  }

                  if (!mounted) return;
                  navigator.pop();

                  if (!mounted) return;
                  scaffoldMessenger.showSnackBar(
                    SnackBar(
                      content: Text(
                        isEditing
                            ? 'Precio fijo actualizado exitosamente'
                            : 'Precio fijo agregado exitosamente',
                      ),
                      backgroundColor: Colors.green,
                    ),
                  );

                  await _loadFixedPrices();
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

  void _handleDelete(Map<String, dynamic> price) {
    final pickUp = price['pick_up'] ?? '';
    final dropOff = price['drop_off'] ?? '';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Precio Fijo'),
        content: Text('¿Estás seguro de que quieres eliminar la ruta $pickUp → $dropOff?'),
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
                await supabaseClient.from('fixed_pricing').delete().eq('id', price['id']);

                if (!mounted) return;
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Precio fijo eliminado exitosamente'),
                    backgroundColor: Colors.green,
                  ),
                );

                await _loadFixedPrices();
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
