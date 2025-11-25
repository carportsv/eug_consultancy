import 'package:flutter/material.dart';
import '../../../auth/supabase_service.dart';

class CustomersListScreen extends StatefulWidget {
  final String status;

  const CustomersListScreen({super.key, required this.status});

  @override
  State<CustomersListScreen> createState() => _CustomersListScreenState();
}

class _CustomersListScreenState extends State<CustomersListScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  String _searchTerm = '';
  int _recordsPerPage = 10;
  int _currentPage = 1;
  List<Map<String, dynamic>> _customers = [];
  List<Map<String, dynamic>> _filteredCustomers = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  Future<void> _loadCustomers() async {
    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      var query = supabaseClient
          .from('users')
          .select('*')
          .eq('role', 'user'); // Solo usuarios, no admins ni drivers

      // Filtrar por estado usando la columna 'status'
      if (widget.status == 'active') {
        query = query.eq('status', 'active');
      } else if (widget.status == 'suspended') {
        query = query.eq('status', 'suspend');
      } else if (widget.status == 'pending') {
        query = query.eq('status', 'pending');
      } else if (widget.status == 'deleted') {
        query = query.eq('status', 'deleted');
      } else if (widget.status == 'deletion_requests') {
        query = query.eq('status', 'deletion request');
      }

      final response = await query.order('created_at', ascending: false);

      final customersList = response as List? ?? [];
      setState(() {
        _customers = List<Map<String, dynamic>>.from(customersList);
        _filterCustomers();
      });
    } catch (e) {
      debugPrint('Error cargando clientes: $e');
      if (mounted) {
        final scaffoldMessenger = ScaffoldMessenger.of(context);
        scaffoldMessenger.showSnackBar(SnackBar(content: Text('Error cargando clientes: $e')));
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  void _filterCustomers() {
    List<Map<String, dynamic>> filtered = [..._customers];

    // Filtrar por término de búsqueda
    if (_searchTerm.isNotEmpty) {
      final term = _searchTerm.toLowerCase();
      filtered = filtered.where((customer) {
        final name = customer['display_name']?.toString().toLowerCase() ?? '';
        final email = customer['email']?.toString().toLowerCase() ?? '';
        final phone = customer['phone_number']?.toString().toLowerCase() ?? '';

        return name.contains(term) || email.contains(term) || phone.contains(term);
      }).toList();
    }

    // Paginación
    final startIndex = (_currentPage - 1) * _recordsPerPage;
    final endIndex = startIndex + _recordsPerPage;
    filtered = filtered.length > startIndex
        ? filtered.sublist(startIndex, endIndex > filtered.length ? filtered.length : endIndex)
        : [];

    setState(() => _filteredCustomers = filtered);
  }

  @override
  void didUpdateWidget(CustomersListScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.status != widget.status) {
      _loadCustomers();
    }
  }

  String _getStatusLabel() {
    switch (widget.status) {
      case 'active':
        return 'Active';
      case 'suspended':
        return 'Suspended';
      case 'pending':
        return 'Pending';
      case 'deleted':
        return 'Deleted';
      case 'deletion_requests':
        return 'Deletion Requests';
      default:
        return 'All';
    }
  }

  int get _totalPages {
    final total = _searchTerm.isNotEmpty
        ? _customers.where((customer) {
            final term = _searchTerm.toLowerCase();
            final name = customer['display_name']?.toString().toLowerCase() ?? '';
            final email = customer['email']?.toString().toLowerCase() ?? '';
            final phone = customer['phone_number']?.toString().toLowerCase() ?? '';
            return name.contains(term) || email.contains(term) || phone.contains(term);
          }).length
        : _customers.length;
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
              // Title
              Text(
                'Customer List - ${_getStatusLabel()}',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1A202C),
                  fontSize: isTablet ? null : 20,
                ),
              ),
              SizedBox(height: isTablet ? 24 : 16),
              // Controls
              _buildControls(isTablet),
              SizedBox(height: isTablet ? 24 : 16),
              // Table
              Expanded(child: _buildTable()),
              SizedBox(height: isTablet ? 16 : 12),
              // Pagination
              if (_totalPages > 1) _buildPagination(),
              // Add New Button
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
              _filterCustomers();
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
            _filterCustomers();
          });
        },
      ),
    );
  }

  Widget _buildTable() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_filteredCustomers.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.person_outline, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text('No hay clientes disponibles', style: TextStyle(color: Colors.grey.shade600)),
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
              itemCount: _filteredCustomers.length,
              itemBuilder: (context, index) {
                final customer = _filteredCustomers[index];
                final displayNumber = (_currentPage - 1) * _recordsPerPage + index + 1;
                return _buildTableRow(customer, displayNumber);
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
        child: const Text('Customer Information', style: TextStyle(fontWeight: FontWeight.bold)),
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
          SizedBox(width: 60, child: _buildHeaderCell('No.')),
          Expanded(flex: 2, child: _buildHeaderCell('Name')),
          Expanded(flex: 2, child: _buildHeaderCell('Email')),
          Expanded(flex: 1, child: _buildHeaderCell('Phone')),
          Expanded(flex: 1, child: _buildHeaderCell('Status')),
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

  Widget _buildTableRow(Map<String, dynamic> customer, int number) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isNarrow = screenWidth < 800;
    final name = customer['display_name'] ?? customer['email'] ?? 'N/A';
    final email = customer['email'] ?? 'N/A';
    final phone = customer['phone_number'] ?? 'N/A';
    // Usar la columna status, con fallback a 'active' si no existe
    final status = customer['status'] ?? 'active';

    if (isNarrow) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$number. $name', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(email, style: TextStyle(color: Colors.grey.shade600)),
            const SizedBox(height: 4),
            Text('Tel: $phone'),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: _getStatusColor(status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(
                      color: _getStatusColor(status),
                      fontWeight: FontWeight.bold,
                      fontSize: 11,
                    ),
                  ),
                ),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit, size: 20, color: Color(0xFFFF9800)),
                      onPressed: () => _handleEdit(customer),
                      tooltip: 'Editar',
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20, color: Color(0xFFF44336)),
                      onPressed: () => _handleDelete(customer),
                      tooltip: 'Eliminar',
                    ),
                  ],
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
          SizedBox(width: 60, child: Text('$number')),
          Expanded(flex: 2, child: Text(name.toString())),
          Expanded(flex: 2, child: Text(email.toString())),
          Expanded(flex: 1, child: Text(phone.toString())),
          Expanded(
            flex: 1,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: _getStatusColor(status).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                status.toUpperCase(),
                style: TextStyle(
                  color: _getStatusColor(status),
                  fontWeight: FontWeight.w500,
                  fontSize: 12,
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
                  onPressed: () => _handleEdit(customer),
                  tooltip: 'Editar',
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  color: const Color(0xFFF44336),
                  onPressed: () => _handleDelete(customer),
                  tooltip: 'Eliminar',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return Colors.green;
      case 'suspend':
        return Colors.orange;
      case 'pending':
        return Colors.blue;
      case 'deleted':
        return Colors.red;
      case 'deletion request':
        return Colors.grey;
      default:
        return Colors.grey;
    }
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
                    _filterCustomers();
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
                    _filterCustomers();
                  });
                }
              : null,
          child: const Text('Siguiente'),
        ),
      ],
    );
  }

  Widget _buildAddNewButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF2563EB),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        onPressed: () {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Función de agregar cliente próximamente')));
        },
        child: const Text(
          'Add New',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  void _handleEdit(Map<String, dynamic> customer) {
    final nameController = TextEditingController(text: customer['display_name'] ?? '');
    final emailController = TextEditingController(text: customer['email'] ?? '');
    final phoneController = TextEditingController(text: customer['phone_number'] ?? '');

    // Usar la columna status, con fallback a 'active' si no existe
    String currentStatus = customer['status'] ?? 'active';

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15.0)),
          title: const Text('Editar Cliente'),
          content: SingleChildScrollView(
            child: StatefulBuilder(
              builder: (BuildContext context, StateSetter setState) {
                return Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: 'Nombre',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: emailController,
                      readOnly: true,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        border: OutlineInputBorder(),
                        fillColor: Color(0xFFf2f2f2),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: phoneController,
                      decoration: const InputDecoration(
                        labelText: 'Teléfono',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildDropdown('Estado', currentStatus, [
                      'active',
                      'suspend',
                      'pending',
                      'deleted',
                      'deletion request',
                    ], (val) => setState(() => currentStatus = val!)),
                  ],
                );
              },
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
              child: const Text('Actualizar', style: TextStyle(color: Colors.white)),
              onPressed: () async {
                if (!mounted) return;
                final navigator = Navigator.of(context);
                final scaffoldMessenger = ScaffoldMessenger.of(context);

                try {
                  final supabaseClient = _supabaseService.client;
                  final firebaseUid = customer['firebase_uid'] as String?;

                  if (firebaseUid == null) {
                    throw Exception('firebase_uid no encontrado');
                  }

                  // Actualizar datos del cliente
                  // Actualizar status y is_active según corresponda
                  final isActive = currentStatus == 'active';
                  final updateData = <String, dynamic>{
                    'display_name': nameController.text,
                    'phone_number': phoneController.text,
                    'status': currentStatus,
                    'is_active': isActive,
                    'updated_at': DateTime.now().toIso8601String(),
                  };

                  await supabaseClient
                      .from('users')
                      .update(updateData)
                      .eq('firebase_uid', firebaseUid);

                  if (!mounted) return;
                  navigator.pop();

                  if (!mounted) return;
                  scaffoldMessenger.showSnackBar(
                    const SnackBar(
                      content: Text('Cliente actualizado exitosamente'),
                      backgroundColor: Colors.green,
                    ),
                  );

                  // Recargar la lista
                  await _loadCustomers();
                } catch (e) {
                  if (!mounted) return;
                  navigator.pop();

                  if (!mounted) return;
                  scaffoldMessenger.showSnackBar(
                    SnackBar(content: Text('Error al actualizar: $e'), backgroundColor: Colors.red),
                  );
                }
              },
            ),
          ],
        );
      },
    );
  }

  Widget _buildDropdown(
    String label,
    String currentValue,
    List<String> items,
    ValueChanged<String?> onChanged,
  ) {
    return InputDecorator(
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isDense: true,
          value: currentValue,
          items: items
              .map((String value) => DropdownMenuItem<String>(value: value, child: Text(value)))
              .toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  void _handleDelete(Map<String, dynamic> customer) {
    final name = customer['display_name'] ?? customer['email'] ?? 'este cliente';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Eliminar Cliente'),
        content: Text(
          '¿Estás seguro de que quieres eliminar a $name?\n\nEl cliente será marcado como eliminado y no aparecerá en las listas activas.',
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
                final firebaseUid = customer['firebase_uid'] as String?;

                if (firebaseUid == null) {
                  throw Exception('firebase_uid no encontrado');
                }

                // Marcar como eliminado
                await supabaseClient
                    .from('users')
                    .update({
                      'status': 'deleted',
                      'is_active': false,
                      'updated_at': DateTime.now().toIso8601String(),
                    })
                    .eq('firebase_uid', firebaseUid);

                if (!mounted) return;
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Cliente eliminado exitosamente'),
                    backgroundColor: Colors.green,
                  ),
                );

                // Recargar la lista
                await _loadCustomers();
              } catch (e) {
                if (!mounted) return;
                scaffoldMessenger.showSnackBar(
                  SnackBar(
                    content: Text('Error al eliminar cliente: $e'),
                    backgroundColor: Colors.red,
                  ),
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
