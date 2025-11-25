import 'package:flutter/material.dart';
import '../../../auth/supabase_service.dart';

class DiscountsSurchargeLocationScreen extends StatefulWidget {
  const DiscountsSurchargeLocationScreen({super.key});

  @override
  State<DiscountsSurchargeLocationScreen> createState() => _DiscountsSurchargeLocationScreenState();
}

class _DiscountsSurchargeLocationScreenState extends State<DiscountsSurchargeLocationScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  String _searchTerm = '';
  int _recordsPerPage = 10;
  int _currentPage = 1;
  List<Map<String, dynamic>> _discounts = [];
  List<Map<String, dynamic>> _filteredDiscounts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadDiscounts();
  }

  Future<void> _loadDiscounts() async {
    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      // Intentar cargar desde tabla 'discounts_location'
      try {
        final response = await supabaseClient
            .from('discounts_location')
            .select('*')
            .order('created_at', ascending: false);

        final discountsList = response as List? ?? [];
        setState(() {
          _discounts = List<Map<String, dynamic>>.from(discountsList);
          _filterDiscounts();
        });
      } catch (e) {
        // Si la tabla no existe, usar datos vacíos
        debugPrint('Tabla discounts_location no encontrada: $e');
        setState(() {
          _discounts = [];
          _filteredDiscounts = [];
        });
      }
    } catch (e) {
      debugPrint('Error cargando discounts location: $e');
      if (mounted) {
        final scaffoldMessenger = ScaffoldMessenger.of(context);
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text('Error cargando discounts location: $e')),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _filterDiscounts() {
    List<Map<String, dynamic>> filtered = [..._discounts];

    // Filtrar por término de búsqueda
    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered.where((discount) {
        final locationType = discount['location_type']?.toString().toLowerCase() ?? '';
        final location = discount['location']?.toString().toLowerCase() ?? '';
        final category = discount['category']?.toString().toLowerCase() ?? '';
        return locationType.contains(term) || location.contains(term) || category.contains(term);
      }).toList();
    }

    // Paginación
    final startIndex = (_currentPage - 1) * _recordsPerPage;
    final endIndex = startIndex + _recordsPerPage;
    filtered = filtered.length > startIndex
        ? filtered.sublist(startIndex, endIndex > filtered.length ? filtered.length : endIndex)
        : [];

    setState(() => _filteredDiscounts = filtered);
  }

  int get _totalPages {
    final total = _searchTerm.isNotEmpty
        ? _discounts.where((discount) {
            final term = _searchTerm.toLowerCase();
            final locationType = discount['location_type']?.toString().toLowerCase() ?? '';
            final location = discount['location']?.toString().toLowerCase() ?? '';
            final category = discount['category']?.toString().toLowerCase() ?? '';
            return locationType.contains(term) ||
                location.contains(term) ||
                category.contains(term);
          }).length
        : _discounts.length;
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
                'Location - Discount / Surcharge Pricing',
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
              _filterDiscounts();
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
      child: Row(
        children: [
          Expanded(
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12.0),
              ),
              onChanged: (value) {
                setState(() {
                  _searchTerm = value;
                  _currentPage = 1;
                  _filterDiscounts();
                });
              },
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              padding: const EdgeInsets.all(12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              // La búsqueda ya se actualiza en tiempo real con onChanged
            },
            child: const Icon(Icons.search, color: Colors.white),
          ),
          const SizedBox(width: 8),
          DropdownButton<String>(
            value: null,
            underline: const SizedBox(),
            items: const [],
            onChanged: (value) {},
            icon: const Icon(Icons.arrow_drop_down),
          ),
        ],
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
          if (_filteredDiscounts.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.location_on, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    Text('No results', style: TextStyle(color: Colors.grey.shade600)),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: _filteredDiscounts.length,
                itemBuilder: (context, index) {
                  final discount = _filteredDiscounts[index];
                  return _buildTableRow(discount);
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
          'Location Discount / Surcharge Information',
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
          Expanded(flex: 1, child: _buildHeaderCell('Location Type')),
          Expanded(flex: 2, child: _buildHeaderCell('Location')),
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

  Widget _buildTableRow(Map<String, dynamic> discount) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 1000;

    final locationType = discount['location_type'] ?? 'N/A';
    final location = discount['location'] ?? 'N/A';
    final category = discount['category'] ?? 'N/A';
    final priceType = discount['price_type'] ?? 'Amount';
    final amountValue = discount['amount'] ?? 0.0;
    final amount = amountValue is num
        ? amountValue
        : (double.tryParse(amountValue.toString()) ?? 0.0);
    final price = priceType == 'Percentage' ? '$amount%' : amount.toStringAsFixed(2);

    if (isNarrow) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Location Type: $locationType',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            Text('Location: $location'),
            Text('Category: $category'),
            Text('Price: $price ${priceType == "Amount" ? "EUR" : ""}'),
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20, color: Color(0xFFFF9800)),
                  onPressed: () => _handleEdit(discount),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20, color: Color(0xFFF44336)),
                  onPressed: () => _handleDelete(discount),
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
          Expanded(flex: 1, child: Text(locationType.toString())),
          Expanded(flex: 2, child: Text(location.toString())),
          Expanded(flex: 1, child: Text(category.toString())),
          Expanded(flex: 1, child: Text('$price ${priceType == "Amount" ? "EUR" : ""}')),
          Expanded(
            flex: 1,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20),
                  color: const Color(0xFFFF9800),
                  onPressed: () => _handleEdit(discount),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20),
                  color: const Color(0xFFF44336),
                  onPressed: () => _handleDelete(discount),
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
                    _filterDiscounts();
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
                    _filterDiscounts();
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

  void _handleEdit(Map<String, dynamic> discount) {
    _showEditDialog(discount: discount);
  }

  void _showEditDialog({Map<String, dynamic>? discount}) {
    final isEditing = discount != null;

    final locationTypeController = TextEditingController(
      text: discount?['location_type'] ?? 'Both',
    );
    final locationController = TextEditingController(text: discount?['location'] ?? '');
    final categoryController = TextEditingController(text: discount?['category'] ?? 'Discount');
    final priceTypeController = TextEditingController(text: discount?['price_type'] ?? 'Amount');
    final amountController = TextEditingController(text: discount?['amount']?.toString() ?? '');

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
                    DropdownButtonFormField<String>(
                      initialValue: locationTypeController.text.isEmpty
                          ? 'Both'
                          : locationTypeController.text,
                      decoration: const InputDecoration(
                        labelText: 'Location Type',
                        border: OutlineInputBorder(),
                      ),
                      items: ['Both', 'Pick Up', 'Drop Off'].map((String value) {
                        return DropdownMenuItem<String>(value: value, child: Text(value));
                      }).toList(),
                      onChanged: (value) {
                        setDialogState(() {
                          locationTypeController.text = value ?? 'Both';
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: locationController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Location',
                        hintText: 'Location/Zone/Postcode',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: categoryController.text.isEmpty
                          ? 'Discount'
                          : categoryController.text,
                      decoration: const InputDecoration(
                        labelText: 'Category',
                        border: OutlineInputBorder(),
                      ),
                      items: ['Discount', 'Surcharge'].map((String value) {
                        return DropdownMenuItem<String>(value: value, child: Text(value));
                      }).toList(),
                      onChanged: (value) {
                        setDialogState(() {
                          categoryController.text = value ?? 'Discount';
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

                      final discountData = {
                        'location_type': locationTypeController.text,
                        'location': locationController.text,
                        'category': categoryController.text,
                        'price_type': priceTypeController.text,
                        'amount': double.tryParse(amountController.text) ?? 0.0,
                        'updated_at': DateTime.now().toIso8601String(),
                      };

                      if (isEditing) {
                        // Actualizar
                        await supabaseClient
                            .from('discounts_location')
                            .update(discountData)
                            .eq('id', discount['id']);
                      } else {
                        // Insertar
                        discountData['created_at'] = DateTime.now().toIso8601String();
                        await supabaseClient.from('discounts_location').insert(discountData);
                      }

                      if (!mounted) return;
                      navigator.pop();

                      if (!mounted) return;
                      scaffoldMessenger.showSnackBar(
                        SnackBar(
                          content: Text(
                            isEditing
                                ? 'Location discount/surcharge actualizado exitosamente'
                                : 'Location discount/surcharge agregado exitosamente',
                          ),
                          backgroundColor: Colors.green,
                        ),
                      );

                      await _loadDiscounts();
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

  void _handleDelete(Map<String, dynamic> discount) {
    final location = discount['location'] ?? '';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Location Discount/Surcharge'),
        content: Text('¿Estás seguro de que quieres eliminar "$location"?'),
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
                await supabaseClient.from('discounts_location').delete().eq('id', discount['id']);

                if (!mounted) return;
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Location discount/surcharge eliminado exitosamente'),
                    backgroundColor: Colors.green,
                  ),
                );

                await _loadDiscounts();
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
