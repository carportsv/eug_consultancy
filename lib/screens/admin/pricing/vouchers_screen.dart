import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../auth/supabase_service.dart';

class VouchersScreen extends StatefulWidget {
  const VouchersScreen({super.key});

  @override
  State<VouchersScreen> createState() => _VouchersScreenState();
}

class _VouchersScreenState extends State<VouchersScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  String _searchTerm = '';
  String _statusFilter = 'Any Status';
  int _recordsPerPage = 10;
  int _currentPage = 1;
  String? _sortColumn;
  bool _sortAscending = true;
  List<Map<String, dynamic>> _vouchers = [];
  List<Map<String, dynamic>> _filteredVouchers = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadVouchers();
  }

  Future<void> _loadVouchers() async {
    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      // Intentar cargar desde tabla 'vouchers'
      try {
        final response = await supabaseClient
            .from('vouchers')
            .select('*')
            .order('created_at', ascending: false);

        final vouchersList = response as List? ?? [];
        setState(() {
          _vouchers = List<Map<String, dynamic>>.from(vouchersList);
          _filterVouchers();
        });
      } catch (e) {
        // Si la tabla no existe, usar datos vacíos
        debugPrint('Tabla vouchers no encontrada: $e');
        setState(() {
          _vouchers = [];
          _filteredVouchers = [];
        });
      }
    } catch (e) {
      debugPrint('Error cargando vouchers: $e');
      if (mounted) {
        final scaffoldMessenger = ScaffoldMessenger.of(context);
        scaffoldMessenger.showSnackBar(SnackBar(content: Text('Error cargando vouchers: $e')));
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _filterVouchers() {
    List<Map<String, dynamic>> filtered = [..._vouchers];

    // Filtrar por estado
    if (_statusFilter != 'Any Status') {
      filtered = filtered.where((voucher) {
        final status = voucher['status']?.toString().toLowerCase() ?? 'active';
        return status == _statusFilter.toLowerCase();
      }).toList();
    }

    // Filtrar por término de búsqueda
    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered.where((voucher) {
        final voucherCode = voucher['voucher']?.toString().toLowerCase() ?? '';
        final applicable = voucher['applicable']?.toString().toLowerCase() ?? '';
        return voucherCode.contains(term) || applicable.contains(term);
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

    setState(() => _filteredVouchers = filtered);
  }

  void _sortBy(String column) {
    setState(() {
      if (_sortColumn == column) {
        _sortAscending = !_sortAscending;
      } else {
        _sortColumn = column;
        _sortAscending = true;
      }
      _filterVouchers();
    });
  }

  int get _totalPages {
    List<Map<String, dynamic>> filtered = [..._vouchers];

    if (_statusFilter != 'Any Status') {
      filtered = filtered.where((voucher) {
        final status = voucher['status']?.toString().toLowerCase() ?? 'active';
        return status == _statusFilter.toLowerCase();
      }).toList();
    }

    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered.where((voucher) {
        final voucherCode = voucher['voucher']?.toString().toLowerCase() ?? '';
        final applicable = voucher['applicable']?.toString().toLowerCase() ?? '';
        return voucherCode.contains(term) || applicable.contains(term);
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
                'Voucher/Coupon',
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
              _filterVouchers();
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
          items: ['Any Status', 'Active', 'Inactive', 'Expired']
              .map((String value) => DropdownMenuItem<String>(value: value, child: Text(value)))
              .toList(),
          onChanged: (newValue) {
            setState(() {
              _statusFilter = newValue!;
              _currentPage = 1;
              _filterVouchers();
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
                  _filterVouchers();
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
          if (_filteredVouchers.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.card_giftcard, size: 48, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    Text('No results', style: TextStyle(color: Colors.grey.shade600)),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.builder(
                itemCount: _filteredVouchers.length,
                itemBuilder: (context, index) {
                  final voucher = _filteredVouchers[index];
                  return _buildTableRow(voucher);
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTableHeader() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 1200;

    if (isNarrow) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
        ),
        child: const Text('Voucher Information', style: TextStyle(fontWeight: FontWeight.bold)),
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
          Expanded(flex: 1, child: _buildHeaderCell('Voucher', null)),
          Expanded(flex: 1, child: _buildHeaderCell('Quantity', null)),
          Expanded(flex: 1, child: _buildHeaderCell('Applicable', null)),
          Expanded(flex: 1, child: _buildHeaderCell('Discount', null)),
          Expanded(flex: 1, child: _buildHeaderCell('Validity', null)),
          Expanded(flex: 1, child: _buildHeaderCell('Applied', null)),
          Expanded(flex: 1, child: _buildHeaderCell('Used', null)),
          Expanded(flex: 1, child: _buildHeaderCell('Status', 'status')),
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

  Widget _buildTableRow(Map<String, dynamic> voucher) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 1200;

    final voucherCode = voucher['voucher'] ?? 'N/A';
    final quantity = voucher['quantity'] ?? 0;
    final applicable = voucher['applicable'] ?? 'N/A';
    final discountType = voucher['discount_type'] ?? 'Amount';
    final discountValue = voucher['discount_value'] ?? 0.0;
    final discount = discountType == 'Percentage'
        ? '$discountValue%'
        : '${discountValue.toStringAsFixed(2)} EUR';
    final validity = voucher['validity'] ?? '';
    final applied = voucher['applied'] ?? 0;
    final used = voucher['used'] ?? 0;
    final status = voucher['status'] ?? 'active';

    // Formatear fecha
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
            Text('Voucher: $voucherCode', style: const TextStyle(fontWeight: FontWeight.bold)),
            Text('Quantity: $quantity'),
            Text('Applicable: $applicable'),
            Text('Discount: $discount'),
            Text('Validity: ${formatDate(validity)}'),
            Text('Applied: $applied'),
            Text('Used: $used'),
            Text('Status: ${status.toString().toUpperCase()}'),
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.edit, size: 20, color: Color(0xFFFF9800)),
                  onPressed: () => _handleEdit(voucher),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20, color: Color(0xFFF44336)),
                  onPressed: () => _handleDelete(voucher),
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
          Expanded(flex: 1, child: Text(voucherCode.toString())),
          Expanded(flex: 1, child: Text(quantity.toString())),
          Expanded(flex: 1, child: Text(applicable.toString())),
          Expanded(flex: 1, child: Text(discount)),
          Expanded(flex: 1, child: Text(formatDate(validity))),
          Expanded(flex: 1, child: Text(applied.toString())),
          Expanded(flex: 1, child: Text(used.toString())),
          Expanded(
            flex: 1,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: status.toString().toLowerCase() == 'active'
                    ? Colors.green.shade100
                    : status.toString().toLowerCase() == 'expired'
                    ? Colors.red.shade100
                    : Colors.grey.shade200,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                status.toString().toUpperCase(),
                style: TextStyle(
                  color: status.toString().toLowerCase() == 'active'
                      ? Colors.green.shade800
                      : status.toString().toLowerCase() == 'expired'
                      ? Colors.red.shade800
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
                  onPressed: () => _handleEdit(voucher),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.delete, size: 20),
                  color: const Color(0xFFF44336),
                  onPressed: () => _handleDelete(voucher),
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
                    _filterVouchers();
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
                    _filterVouchers();
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

  void _handleEdit(Map<String, dynamic> voucher) {
    _showEditDialog(voucher: voucher);
  }

  void _showEditDialog({Map<String, dynamic>? voucher}) {
    final isEditing = voucher != null;

    final voucherController = TextEditingController(text: voucher?['voucher'] ?? '');
    final quantityController = TextEditingController(text: voucher?['quantity']?.toString() ?? '');
    final applicableController = TextEditingController(text: voucher?['applicable'] ?? '');
    final validityController = TextEditingController(
      text: voucher != null && voucher['validity'] != null
          ? DateFormat('yyyy-MM-dd').format(DateTime.parse(voucher['validity'].toString()))
          : '',
    );
    final discountTypeController = TextEditingController(
      text: voucher?['discount_type'] ?? 'Amount',
    );
    final discountValueController = TextEditingController(
      text: voucher?['discount_value']?.toString() ?? '',
    );

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
                      controller: voucherController,
                      decoration: const InputDecoration(
                        labelText: 'Voucher',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: quantityController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Quantity',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: applicableController,
                      decoration: const InputDecoration(
                        labelText: 'Applicable',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: validityController,
                      decoration: const InputDecoration(
                        labelText: 'Validity',
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.calendar_today),
                      ),
                      readOnly: true,
                      enabled: true,
                      style: TextStyle(color: Colors.grey.shade600),
                      onTap: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: validityController.text.isNotEmpty
                              ? DateTime.tryParse(validityController.text) ?? DateTime.now()
                              : DateTime.now(),
                          firstDate: DateTime.now(),
                          lastDate: DateTime(2100),
                        );
                        if (date != null) {
                          setDialogState(() {
                            validityController.text = DateFormat('yyyy-MM-dd').format(date);
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      initialValue: discountTypeController.text.isEmpty
                          ? 'Amount'
                          : discountTypeController.text,
                      decoration: const InputDecoration(
                        labelText: 'Discount Type',
                        border: OutlineInputBorder(),
                      ),
                      items: ['Amount', 'Percentage'].map((String value) {
                        return DropdownMenuItem<String>(value: value, child: Text(value));
                      }).toList(),
                      onChanged: (value) {
                        setDialogState(() {
                          discountTypeController.text = value ?? 'Amount';
                        });
                      },
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: discountValueController,
                      keyboardType: TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Discount Value',
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

                      final voucherData = {
                        'voucher': voucherController.text,
                        'quantity': int.tryParse(quantityController.text) ?? 0,
                        'applicable': applicableController.text,
                        'validity': validityController.text.isEmpty
                            ? null
                            : DateTime.parse(validityController.text).toIso8601String(),
                        'discount_type': discountTypeController.text,
                        'discount_value': double.tryParse(discountValueController.text) ?? 0.0,
                        'applied': voucher?['applied'] ?? 0,
                        'used': voucher?['used'] ?? 0,
                        'status': voucher?['status'] ?? 'active',
                        'updated_at': DateTime.now().toIso8601String(),
                      };

                      if (isEditing) {
                        // Actualizar
                        await supabaseClient
                            .from('vouchers')
                            .update(voucherData)
                            .eq('id', voucher['id']);
                      } else {
                        // Insertar
                        voucherData['created_at'] = DateTime.now().toIso8601String();
                        await supabaseClient.from('vouchers').insert(voucherData);
                      }

                      if (!mounted) return;
                      navigator.pop();

                      if (!mounted) return;
                      scaffoldMessenger.showSnackBar(
                        SnackBar(
                          content: Text(
                            isEditing
                                ? 'Voucher actualizado exitosamente'
                                : 'Voucher agregado exitosamente',
                          ),
                          backgroundColor: Colors.green,
                        ),
                      );

                      await _loadVouchers();
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

  void _handleDelete(Map<String, dynamic> voucher) {
    final voucherCode = voucher['voucher'] ?? '';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Voucher'),
        content: Text('¿Estás seguro de que quieres eliminar "$voucherCode"?'),
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
                await supabaseClient.from('vouchers').delete().eq('id', voucher['id']);

                if (!mounted) return;
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Voucher eliminado exitosamente'),
                    backgroundColor: Colors.green,
                  ),
                );

                await _loadVouchers();
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
