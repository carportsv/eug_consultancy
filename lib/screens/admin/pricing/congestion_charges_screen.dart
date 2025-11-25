import 'package:flutter/material.dart';
import '../../../auth/supabase_service.dart';

class CongestionChargesScreen extends StatefulWidget {
  const CongestionChargesScreen({super.key});

  @override
  State<CongestionChargesScreen> createState() => _CongestionChargesScreenState();
}

class _CongestionChargesScreenState extends State<CongestionChargesScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  String _searchTerm = '';
  int _recordsPerPage = 10;
  int _currentPage = 1;
  List<Map<String, dynamic>> _charges = [];
  List<Map<String, dynamic>> _filteredCharges = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadCharges();
  }

  Future<void> _loadCharges() async {
    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      // Intentar cargar desde tabla 'congestion_charges'
      try {
        final response = await supabaseClient
            .from('congestion_charges')
            .select('*')
            .order('created_at', ascending: false);

        final chargesList = response as List? ?? [];
        setState(() {
          _charges = List<Map<String, dynamic>>.from(chargesList);
          _filterCharges();
        });
      } catch (e) {
        // Si la tabla no existe, usar datos vacíos
        debugPrint('Tabla congestion_charges no encontrada: $e');
        setState(() {
          _charges = [];
          _filteredCharges = [];
        });
      }
    } catch (e) {
      debugPrint('Error cargando congestion charges: $e');
      if (mounted) {
        final scaffoldMessenger = ScaffoldMessenger.of(context);
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text('Error cargando congestion charges: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _filterCharges() {
    List<Map<String, dynamic>> filtered = [..._charges];

    // Filtrar por término de búsqueda
    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered.where((charge) {
        final caption = charge['caption']?.toString().toLowerCase() ?? '';
        final locations = charge['locations']?.toString().toLowerCase() ?? '';
        final category = charge['category']?.toString().toLowerCase() ?? '';
        final days = charge['days']?.toString().toLowerCase() ?? '';
        return caption.contains(term) ||
            locations.contains(term) ||
            category.contains(term) ||
            days.contains(term);
      }).toList();
    }

    // Paginación
    final startIndex = (_currentPage - 1) * _recordsPerPage;
    final endIndex = startIndex + _recordsPerPage;
    filtered = filtered.length > startIndex
        ? filtered.sublist(startIndex, endIndex > filtered.length ? filtered.length : endIndex)
        : [];

    setState(() => _filteredCharges = filtered);
  }

  int get _totalPages {
    final total = _searchTerm.isNotEmpty
        ? _charges.where((charge) {
            final term = _searchTerm.toLowerCase();
            final caption = charge['caption']?.toString().toLowerCase() ?? '';
            final locations = charge['locations']?.toString().toLowerCase() ?? '';
            final category = charge['category']?.toString().toLowerCase() ?? '';
            final days = charge['days']?.toString().toLowerCase() ?? '';
            return caption.contains(term) ||
                locations.contains(term) ||
                category.contains(term) ||
                days.contains(term);
          }).length
        : _charges.length;
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
                'Congestion Charges',
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
              _filterCharges();
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
            _filterCharges();
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
          if (_filteredCharges.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.traffic, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    Text('No results', style: TextStyle(color: Colors.grey.shade600)),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: _filteredCharges.length,
                itemBuilder: (context, index) {
                  final charge = _filteredCharges[index];
                  return _buildTableRow(charge);
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
          'Congestion Charges Information',
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
          Expanded(flex: 2, child: _buildHeaderCell('Caption')),
          Expanded(flex: 2, child: _buildHeaderCell('Locations')),
          Expanded(flex: 1, child: _buildHeaderCell('Days')),
          Expanded(flex: 1, child: _buildHeaderCell('Time')),
          Expanded(flex: 1, child: _buildHeaderCell('Category')),
          Expanded(flex: 1, child: _buildHeaderCell('Price (EUR)')),
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

  Widget _buildTableRow(Map<String, dynamic> charge) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 1000;

    final caption = charge['caption'] ?? 'N/A';
    final locations = charge['locations'] ?? 'N/A';
    final days = charge['days'] ?? 'N/A';
    final fromTime = charge['from_time'] ?? '';
    final toTime = charge['to_time'] ?? '';
    final time = fromTime.isNotEmpty && toTime.isNotEmpty
        ? '$fromTime - $toTime'
        : (charge['time'] ?? 'N/A');
    final category = charge['category'] ?? 'N/A';
    final priceType = charge['price_type'] ?? 'Amount';
    final amountValue = charge['amount'] ?? charge['price'] ?? 0.0;
    final amount = amountValue is num
        ? amountValue
        : (double.tryParse(amountValue.toString()) ?? 0.0);
    final price = priceType == 'Percentage' ? '$amount%' : '${amount.toStringAsFixed(2)} EUR';

    if (isNarrow) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Caption: $caption', style: const TextStyle(fontWeight: FontWeight.bold)),
            Text('Locations: $locations'),
            Text('Days: $days'),
            Text('Time: $time'),
            Text('Category: $category'),
            Text('Price: $price'),
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20, color: Color(0xFFFF9800)),
                  onPressed: () => _handleEdit(charge),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20, color: Color(0xFFF44336)),
                  onPressed: () => _handleDelete(charge),
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
          Expanded(flex: 2, child: Text(caption.toString())),
          Expanded(flex: 2, child: Text(locations.toString())),
          Expanded(flex: 1, child: Text(days.toString())),
          Expanded(flex: 1, child: Text(time.toString())),
          Expanded(flex: 1, child: Text(category.toString())),
          Expanded(flex: 1, child: Text(price)),
          Expanded(
            flex: 1,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20),
                  color: const Color(0xFFFF9800),
                  onPressed: () => _handleEdit(charge),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20),
                  color: const Color(0xFFF44336),
                  onPressed: () => _handleDelete(charge),
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
                    _filterCharges();
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
                    _filterCharges();
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

  void _handleEdit(Map<String, dynamic> charge) {
    _showEditDialog(charge: charge);
  }

  void _showEditDialog({Map<String, dynamic>? charge}) {
    final isEditing = charge != null;

    // Parsear días desde string o JSON
    Set<String> selectedDays = {};
    if (charge != null && charge['days'] != null) {
      if (charge['days'] is String) {
        try {
          final daysList = charge['days'].toString().split(',');
          selectedDays = daysList.map((d) => d.trim()).toSet();
        } catch (e) {
          // Si no se puede parsear, usar el string directamente
        }
      }
    }

    final captionController = TextEditingController(text: charge?['caption'] ?? '');
    final locationsController = TextEditingController(text: charge?['locations'] ?? '');
    final fromTimeController = TextEditingController(text: charge?['from_time'] ?? '');
    final toTimeController = TextEditingController(text: charge?['to_time'] ?? '');
    final categoryController = TextEditingController(text: charge?['category'] ?? 'Surcharge');
    final priceTypeController = TextEditingController(text: charge?['price_type'] ?? 'Amount');
    final amountController = TextEditingController(text: charge?['amount']?.toString() ?? '');

    final daysList = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
              title: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(isEditing ? 'Edit' : 'Add New'),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: captionController,
                      decoration: const InputDecoration(
                        labelText: 'Caption',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: locationsController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Locations',
                        hintText: 'Location/Zone/Postcode',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text('Days', style: TextStyle(fontWeight: FontWeight.w500)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      children: daysList.map((day) {
                        final isSelected = selectedDays.contains(day);
                        return FilterChip(
                          label: Text(day),
                          selected: isSelected,
                          onSelected: (selected) {
                            setDialogState(() {
                              if (selected) {
                                selectedDays.add(day);
                              } else {
                                selectedDays.remove(day);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: fromTimeController,
                      decoration: const InputDecoration(
                        labelText: 'From Time',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: toTimeController,
                      decoration: const InputDecoration(
                        labelText: 'To Time',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: categoryController.text.isEmpty
                          ? 'Surcharge'
                          : categoryController.text,
                      decoration: const InputDecoration(
                        labelText: 'Category',
                        border: OutlineInputBorder(),
                      ),
                      items: ['Surcharge', 'Discount'].map((String value) {
                        return DropdownMenuItem<String>(value: value, child: Text(value));
                      }).toList(),
                      onChanged: (value) {
                        setDialogState(() {
                          categoryController.text = value ?? 'Surcharge';
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: priceTypeController.text.isEmpty
                          ? 'Amount'
                          : priceTypeController.text,
                      decoration: const InputDecoration(
                        labelText: 'Price Type',
                        border: OutlineInputBorder(),
                      ),
                      items: ['Amount', 'Percentage'].map((String value) {
                        return DropdownMenuItem<String>(value: value, child: Text(value));
                      }).toList(),
                      onChanged: (value) {
                        setDialogState(() {
                          priceTypeController.text = value ?? 'Amount';
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: amountController,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Amount / Percentage',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
                  child: Text(
                    isEditing ? 'Update' : 'Add',
                    style: const TextStyle(color: Colors.white),
                  ),
                  onPressed: () async {
                    if (!mounted) return;
                    final navigator = Navigator.of(context);
                    final scaffoldMessenger = ScaffoldMessenger.of(context);

                    try {
                      final supabaseClient = _supabaseService.client;

                      final chargeData = {
                        'caption': captionController.text,
                        'locations': locationsController.text,
                        'days': selectedDays.join(', '),
                        'from_time': fromTimeController.text,
                        'to_time': toTimeController.text,
                        'category': categoryController.text,
                        'price_type': priceTypeController.text,
                        'amount': double.tryParse(amountController.text) ?? 0.0,
                        'updated_at': DateTime.now().toIso8601String(),
                      };

                      if (isEditing) {
                        // Actualizar
                        await supabaseClient
                            .from('congestion_charges')
                            .update(chargeData)
                            .eq('id', charge['id']);
                      } else {
                        // Insertar
                        chargeData['created_at'] = DateTime.now().toIso8601String();
                        await supabaseClient.from('congestion_charges').insert(chargeData);
                      }

                      if (!mounted) return;
                      navigator.pop();

                      if (!mounted) return;
                      scaffoldMessenger.showSnackBar(
                        SnackBar(
                          content: Text(
                            isEditing
                                ? 'Congestion charge actualizado exitosamente'
                                : 'Congestion charge agregado exitosamente',
                          ),
                          backgroundColor: Colors.green,
                        ),
                      );

                      await _loadCharges();
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
      },
    );
  }

  void _handleDelete(Map<String, dynamic> charge) {
    final caption = charge['caption'] ?? '';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Congestion Charge'),
        content: Text('¿Estás seguro de que quieres eliminar "$caption"?'),
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
                await supabaseClient.from('congestion_charges').delete().eq('id', charge['id']);

                if (!mounted) return;
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Congestion charge eliminado exitosamente'),
                    backgroundColor: Colors.green,
                  ),
                );

                await _loadCharges();
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
