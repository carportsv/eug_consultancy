import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../auth/supabase_service.dart';

class DiscountsDateScreen extends StatefulWidget {
  const DiscountsDateScreen({super.key});

  @override
  State<DiscountsDateScreen> createState() => _DiscountsDateScreenState();
}

class _DiscountsDateScreenState extends State<DiscountsDateScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  String _searchTerm = '';
  String _statusFilter = 'Active';
  int _recordsPerPage = 10;
  int _currentPage = 1;
  String? _sortColumn;
  bool _sortAscending = true;
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

      // Intentar cargar desde tabla 'discounts_date'
      try {
        final response = await supabaseClient
            .from('discounts_date')
            .select('*')
            .order('created_at', ascending: false);

        final discountsList = response as List? ?? [];
        setState(() {
          _discounts = List<Map<String, dynamic>>.from(discountsList);
          _filterDiscounts();
        });
      } catch (e) {
        // Si la tabla no existe, usar datos vacíos
        debugPrint('Tabla discounts_date no encontrada: $e');
        setState(() {
          _discounts = [];
          _filteredDiscounts = [];
        });
      }
    } catch (e) {
      debugPrint('Error cargando discounts: $e');
      if (mounted) {
        final scaffoldMessenger = ScaffoldMessenger.of(context);
        scaffoldMessenger.showSnackBar(SnackBar(content: Text('Error cargando discounts: $e')));
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _filterDiscounts() {
    List<Map<String, dynamic>> filtered = [..._discounts];

    // Filtrar por estado
    if (_statusFilter != 'All') {
      filtered = filtered.where((discount) {
        final status = discount['status']?.toString().toLowerCase() ?? 'active';
        return status == _statusFilter.toLowerCase();
      }).toList();
    }

    // Filtrar por término de búsqueda
    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered.where((discount) {
        final caption = discount['caption']?.toString().toLowerCase() ?? '';
        final category = discount['category']?.toString().toLowerCase() ?? '';
        return caption.contains(term) || category.contains(term);
      }).toList();
    }

    // Ordenar
    if (_sortColumn != null) {
      filtered.sort((a, b) {
        final aValue = a[_sortColumn] ?? '';
        final bValue = b[_sortColumn] ?? '';
        final comparison = aValue.toString().compareTo(bValue.toString());
        return _sortAscending ? comparison : -comparison;
      });
    }

    // Paginación
    final startIndex = (_currentPage - 1) * _recordsPerPage;
    final endIndex = startIndex + _recordsPerPage;
    filtered = filtered.length > startIndex
        ? filtered.sublist(startIndex, endIndex > filtered.length ? filtered.length : endIndex)
        : [];

    setState(() => _filteredDiscounts = filtered);
  }

  void _sortBy(String column) {
    setState(() {
      if (_sortColumn == column) {
        _sortAscending = !_sortAscending;
      } else {
        _sortColumn = column;
        _sortAscending = true;
      }
      _filterDiscounts();
    });
  }

  int get _totalPages {
    List<Map<String, dynamic>> filtered = [..._discounts];

    if (_statusFilter != 'All') {
      filtered = filtered.where((discount) {
        final status = discount['status']?.toString().toLowerCase() ?? 'active';
        return status == _statusFilter.toLowerCase();
      }).toList();
    }

    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered.where((discount) {
        final caption = discount['caption']?.toString().toLowerCase() ?? '';
        final category = discount['category']?.toString().toLowerCase() ?? '';
        return caption.contains(term) || category.contains(term);
      }).toList();
    }

    final total = filtered.length;
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
                'Discount / Surcharge Pricing',
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
        final isNarrow = constraints.maxWidth < 600;

        if (isNarrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildRecordsDropdown(),
              const SizedBox(height: 12),
              _buildStatusDropdown(),
              const SizedBox(height: 12),
              _buildSearchField(),
            ],
          );
        }

        return Row(
          children: [
            SizedBox(width: 150, child: _buildRecordsDropdown()),
            const SizedBox(width: 12),
            SizedBox(width: 150, child: _buildStatusDropdown()),
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

  Widget _buildStatusDropdown() {
    return Material(
      elevation: 0,
      color: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12.0),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8.0),
        ),
        child: DropdownButton<String>(
          value: _statusFilter,
          underline: const SizedBox(),
          isExpanded: true,
          items: ['All', 'Active', 'Inactive']
              .map((String value) => DropdownMenuItem<String>(value: value, child: Text(value)))
              .toList(),
          onChanged: (newValue) {
            setState(() {
              _statusFilter = newValue!;
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
            _filterDiscounts();
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
          if (_filteredDiscounts.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.local_offer, size: 48, color: Colors.grey.shade400),
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
          'Discount / Surcharge Information',
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
          Expanded(flex: 2, child: _buildHeaderCell('Caption', 'caption')),
          Expanded(flex: 1, child: _buildHeaderCell('Recurring', 'recurring')),
          Expanded(flex: 1, child: _buildHeaderCell('From', 'from_date')),
          Expanded(flex: 1, child: _buildHeaderCell('To', 'to_date')),
          Expanded(flex: 1, child: _buildHeaderCell('Category', 'category')),
          Expanded(flex: 1, child: _buildHeaderCell('Price (EUR)', 'amount')),
          Expanded(flex: 1, child: _buildHeaderCell('Status', 'status')),
          Expanded(flex: 1, child: _buildHeaderCell('', null)),
        ],
      ),
    );
  }

  Widget _buildHeaderCell(String text, String? column) {
    final isSortable = column != null && column.isNotEmpty;
    final isSorted = _sortColumn == column;
    final columnValue = column;

    return InkWell(
      onTap: isSortable && columnValue != null ? () => _sortBy(columnValue) : null,
      child: Row(
        children: [
          Text(
            text,
            style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF374151)),
          ),
          if (isSortable) ...[
            const SizedBox(width: 4),
            Icon(
              isSorted
                  ? (_sortAscending ? Icons.arrow_upward : Icons.arrow_downward)
                  : Icons.unfold_more,
              size: 16,
              color: Colors.grey.shade600,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTableRow(Map<String, dynamic> discount) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 1000;

    final caption = discount['caption'] ?? 'N/A';
    final recurring = discount['recurring'] ?? false;
    final fromDate = discount['from_date'] ?? '';
    final toDate = discount['to_date'] ?? '';
    final category = discount['category'] ?? 'N/A';
    final priceType = discount['price_type'] ?? 'Amount';
    final amountValue = discount['amount'] ?? 0.0;
    final amount = amountValue is num
        ? amountValue
        : (double.tryParse(amountValue.toString()) ?? 0.0);
    final price = priceType == 'Percentage' ? '$amount%' : amount.toStringAsFixed(2);
    final status = discount['status'] ?? 'active';

    // Formatear fechas
    String formatDate(String dateStr) {
      if (dateStr.isEmpty) return 'N/A';
      try {
        final date = DateTime.parse(dateStr);
        return DateFormat('yyyy-MM-dd').format(date);
      } catch (e) {
        return dateStr;
      }
    }

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
            Text('Recurring: ${recurring ? "Yes" : "No"}'),
            Text('From: ${formatDate(fromDate)}'),
            Text('To: ${formatDate(toDate)}'),
            Text('Category: $category'),
            Text('Price: $price ${priceType == "Amount" ? "EUR" : ""}'),
            Text('Status: ${status.toString().toUpperCase()}'),
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
          Expanded(flex: 2, child: Text(caption.toString())),
          Expanded(flex: 1, child: Text(recurring ? 'Yes' : 'No')),
          Expanded(flex: 1, child: Text(formatDate(fromDate))),
          Expanded(flex: 1, child: Text(formatDate(toDate))),
          Expanded(flex: 1, child: Text(category.toString())),
          Expanded(flex: 1, child: Text('$price ${priceType == "Amount" ? "EUR" : ""}')),
          Expanded(
            flex: 1,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: status.toString().toLowerCase() == 'active'
                    ? Colors.green.shade100
                    : Colors.grey.shade200,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                status.toString().toUpperCase(),
                style: TextStyle(
                  color: status.toString().toLowerCase() == 'active'
                      ? Colors.green.shade800
                      : Colors.grey.shade700,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
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

    final captionController = TextEditingController(text: discount?['caption'] ?? '');
    final recurringController = TextEditingController(
      text: discount?['recurring'] == true ? 'Yes' : 'No',
    );
    final fromDateController = TextEditingController(
      text: discount != null && discount['from_date'] != null
          ? DateFormat('yyyy-MM-dd').format(DateTime.parse(discount['from_date'].toString()))
          : '',
    );
    final toDateController = TextEditingController(
      text: discount != null && discount['to_date'] != null
          ? DateFormat('yyyy-MM-dd').format(DateTime.parse(discount['to_date'].toString()))
          : '',
    );
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
                    TextField(
                      controller: captionController,
                      decoration: const InputDecoration(
                        labelText: 'Caption',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: recurringController.text,
                      decoration: const InputDecoration(
                        labelText: 'Recurring',
                        border: OutlineInputBorder(),
                      ),
                      items: ['No', 'Yes'].map((String value) {
                        return DropdownMenuItem<String>(value: value, child: Text(value));
                      }).toList(),
                      onChanged: (value) {
                        setDialogState(() {
                          recurringController.text = value ?? 'No';
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: fromDateController,
                      decoration: const InputDecoration(
                        labelText: 'From Date',
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.calendar_today),
                      ),
                      readOnly: true,
                      onTap: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: fromDateController.text.isNotEmpty
                              ? DateTime.tryParse(fromDateController.text) ?? DateTime.now()
                              : DateTime.now(),
                          firstDate: DateTime(2000),
                          lastDate: DateTime(2100),
                        );
                        if (date != null) {
                          setDialogState(() {
                            fromDateController.text = DateFormat('yyyy-MM-dd').format(date);
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: toDateController,
                      decoration: const InputDecoration(
                        labelText: 'To Date',
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.calendar_today),
                      ),
                      readOnly: true,
                      onTap: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: toDateController.text.isNotEmpty
                              ? DateTime.tryParse(toDateController.text) ?? DateTime.now()
                              : DateTime.now(),
                          firstDate: DateTime(2000),
                          lastDate: DateTime(2100),
                        );
                        if (date != null) {
                          setDialogState(() {
                            toDateController.text = DateFormat('yyyy-MM-dd').format(date);
                          });
                        }
                      },
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
                        'caption': captionController.text,
                        'recurring': recurringController.text == 'Yes',
                        'from_date': fromDateController.text.isEmpty
                            ? null
                            : DateTime.parse(
                                fromDateController.text,
                              ).toIso8601String().split('T')[0],
                        'to_date': toDateController.text.isEmpty
                            ? null
                            : DateTime.parse(toDateController.text).toIso8601String().split('T')[0],
                        'category': categoryController.text,
                        'price_type': priceTypeController.text,
                        'amount': double.tryParse(amountController.text) ?? 0.0,
                        'status': discount?['status'] ?? 'active',
                        'updated_at': DateTime.now().toIso8601String(),
                      };

                      if (isEditing) {
                        // Actualizar
                        await supabaseClient
                            .from('discounts_date')
                            .update(discountData)
                            .eq('id', discount['id']);
                      } else {
                        // Insertar
                        discountData['created_at'] = DateTime.now().toIso8601String();
                        await supabaseClient.from('discounts_date').insert(discountData);
                      }

                      if (!mounted) return;
                      navigator.pop();

                      if (!mounted) return;
                      scaffoldMessenger.showSnackBar(
                        SnackBar(
                          content: Text(
                            isEditing
                                ? 'Discount/Surcharge actualizado exitosamente'
                                : 'Discount/Surcharge agregado exitosamente',
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
    final caption = discount['caption'] ?? '';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Discount/Surcharge'),
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
                await supabaseClient.from('discounts_date').delete().eq('id', discount['id']);

                if (!mounted) return;
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Discount/Surcharge eliminado exitosamente'),
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
