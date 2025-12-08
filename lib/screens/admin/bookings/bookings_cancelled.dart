import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../auth/supabase_service.dart';

class BookingsCancelledScreen extends StatefulWidget {
  const BookingsCancelledScreen({super.key});

  @override
  State<BookingsCancelledScreen> createState() => _BookingsCancelledScreenState();
}

class _BookingsCancelledScreenState extends State<BookingsCancelledScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  String _searchTerm = '';
  int _recordsPerPage = 10;
  String? _selectedDate;
  String? _selectedCustomer;
  String? _selectedDriver;

  List<Map<String, dynamic>> _rides = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadCancelledRides();
  }

  Future<void> _loadCancelledRides() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final supabaseClient = _supabaseService.client;

      // Cargar viajes con status 'cancelled'
      var query = supabaseClient
          .from('ride_requests')
          .select('''
            *,
            user:users!ride_requests_user_id_fkey(id, email, display_name, phone_number)
          ''')
          .eq('status', 'cancelled');

      // Aplicar filtros de fecha si existen
      if (_selectedDate != null) {
        final date = DateTime.parse(_selectedDate!);
        final startOfDay = DateTime(date.year, date.month, date.day);
        final endOfDay = startOfDay.add(const Duration(days: 1));
        query = query
            .gte('created_at', startOfDay.toIso8601String())
            .lt('created_at', endOfDay.toIso8601String());
      }

      // Obtener todos los bookings sin ordenar primero
      final response = await query;

      // Ordenar por fecha del viaje (scheduled_at si existe, sino created_at), más cercanos primero
      final sortedRides = (response as List).cast<Map<String, dynamic>>();
      sortedRides.sort((a, b) {
        // Usar scheduled_at si existe, sino created_at
        final dateA = a['scheduled_at'] != null
            ? DateTime.parse(a['scheduled_at'])
            : (a['created_at'] != null ? DateTime.parse(a['created_at']) : DateTime(1970));
        final dateB = b['scheduled_at'] != null
            ? DateTime.parse(b['scheduled_at'])
            : (b['created_at'] != null ? DateTime.parse(b['created_at']) : DateTime(1970));
        // Ordenar ascendente (más cercanos primero)
        return dateA.compareTo(dateB);
      });

      if (mounted) {
        setState(() {
          _rides = sortedRides;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error cargando viajes cancelados: $e');
      }
      if (mounted) {
        setState(() {
          _errorMessage = 'Error al cargar viajes: ${e.toString()}';
          _isLoading = false;
        });
      }
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Bookings - Cancelled',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1A202C),
                      fontSize: isTablet ? null : 20,
                    ),
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.refresh),
                        onPressed: _loadCancelledRides,
                        tooltip: 'Refresh',
                      ),
                      IconButton(
                        icon: const Icon(Icons.keyboard),
                        onPressed: () {},
                        tooltip: 'Keyboard shortcuts',
                      ),
                    ],
                  ),
                ],
              ),
              SizedBox(height: isTablet ? 24 : 16),
              _buildControls(isTablet),
              SizedBox(height: isTablet ? 24 : 16),
              Expanded(child: _buildBookingsList()),
              SizedBox(height: isTablet ? 16 : 12),
              _buildBottomActions(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildControls(bool isTablet) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 800;

        if (isNarrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildRecordsDropdown(),
              const SizedBox(height: 12),
              _buildDateFilter(),
              const SizedBox(height: 12),
              _buildCustomerFilter(),
              const SizedBox(height: 12),
              _buildDriverFilter(),
              const SizedBox(height: 12),
              _buildSearchField(),
            ],
          );
        }

        return Row(
          children: [
            SizedBox(width: 150, child: _buildRecordsDropdown()),
            const SizedBox(width: 12),
            Expanded(child: _buildDateFilter()),
            const SizedBox(width: 12),
            Expanded(child: _buildCustomerFilter()),
            const SizedBox(width: 12),
            Expanded(child: _buildDriverFilter()),
            const SizedBox(width: 12),
            SizedBox(width: 200, child: _buildSearchField()),
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
                (int value) => DropdownMenuItem<int>(value: value, child: Text('$value Bookings')),
              )
              .toList(),
          onChanged: (newValue) {
            setState(() => _recordsPerPage = newValue!);
          },
        ),
      ),
    );
  }

  Widget _buildDateFilter() {
    return Material(
      elevation: 0,
      color: Colors.transparent,
      child: TextField(
        readOnly: true,
        decoration: InputDecoration(
          hintText: 'Date',
          border: const OutlineInputBorder(),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 12.0),
          suffixIcon: _selectedDate != null
              ? IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: () {
                    setState(() => _selectedDate = null);
                    _loadCancelledRides();
                  },
                )
              : const Icon(Icons.calendar_today, size: 18),
        ),
        onTap: () async {
          final date = await showDatePicker(
            context: context,
            initialDate: DateTime.now(),
            firstDate: DateTime(2020),
            lastDate: DateTime(2100),
          );
          if (date != null) {
            setState(() => _selectedDate = DateFormat('yyyy-MM-dd').format(date));
            _loadCancelledRides();
          }
        },
      ),
    );
  }

  Widget _buildCustomerFilter() {
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
          value: _selectedCustomer,
          underline: const SizedBox(),
          isExpanded: true,
          hint: const Text('All Customers'),
          items: [const DropdownMenuItem<String>(value: null, child: Text('All Customers'))],
          onChanged: (newValue) {
            setState(() => _selectedCustomer = newValue);
          },
        ),
      ),
    );
  }

  Widget _buildDriverFilter() {
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
          value: _selectedDriver,
          underline: const SizedBox(),
          isExpanded: true,
          hint: const Text('All Drivers'),
          items: [const DropdownMenuItem<String>(value: null, child: Text('All Drivers'))],
          onChanged: (newValue) {
            setState(() => _selectedDriver = newValue);
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
          contentPadding: EdgeInsets.symmetric(horizontal: 12.0, vertical: 12.0),
          suffixIcon: Icon(Icons.search),
        ),
        onChanged: (value) {
          setState(() => _searchTerm = value.toLowerCase());
        },
      ),
    );
  }

  Widget _buildBookingsList() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              style: const TextStyle(color: Colors.red),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _loadCancelledRides, child: const Text('Reintentar')),
          ],
        ),
      );
    }

    // Filtrar por búsqueda
    final filteredRides = _rides.where((ride) {
      if (_searchTerm.isEmpty) return true;

      final origin = (ride['origin'] as Map?)?['address']?.toString().toLowerCase() ?? '';
      final destination = (ride['destination'] as Map?)?['address']?.toString().toLowerCase() ?? '';
      final clientName = ride['client_name']?.toString().toLowerCase() ?? '';
      final userEmail = (ride['user'] as Map?)?['email']?.toString().toLowerCase() ?? '';

      return origin.contains(_searchTerm) ||
          destination.contains(_searchTerm) ||
          clientName.contains(_searchTerm) ||
          userEmail.contains(_searchTerm);
    }).toList();

    if (filteredRides.isEmpty) {
      return const Center(
        child: Text('No Records', style: TextStyle(color: Colors.grey, fontSize: 16)),
      );
    }

    return ListView.builder(
      itemCount: filteredRides.length,
      itemBuilder: (context, index) {
        final ride = filteredRides[index];
        return _buildBookingCard(ride);
      },
    );
  }

  Widget _buildBookingCard(Map<String, dynamic> ride) {
    final user = ride['user'] as Map<String, dynamic>?;
    final userName = user?['display_name'] ?? user?['email'] ?? 'Sin nombre';
    final clientName = ride['client_name']?.toString() ?? userName.toString();
    final createdAt = ride['created_at'] != null
        ? DateTime.parse(ride['created_at'])
        : DateTime.now();
    // Fecha del viaje (scheduled_at si existe, sino created_at)
    final rideDate = ride['scheduled_at'] != null
        ? DateTime.parse(ride['scheduled_at'])
        : createdAt;
    final formattedRideDate = DateFormat('MM/dd/yyyy HH:mm').format(rideDate);
    final origin = (ride['origin'] as Map?)?['address']?.toString() ?? 'N/A';
    final destination = (ride['destination'] as Map?)?['address']?.toString() ?? 'N/A';
    final price = ride['price'] ?? 0.0;
    final phoneNumber = ride['phone_number']?.toString() ?? '';
    final flightNumber = ride['flight_number']?.toString() ?? '';
    final cancellationReason = ride['cancellation_reason']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(color: Colors.grey.shade200, width: 1),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {},
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar con gradiente profesional
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1D4ED8), Color(0xFF3B82F6)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF1D4ED8).withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.person, color: Colors.white, size: 32),
                ),
                const SizedBox(width: 20),
                // Información principal
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              clientName,
                              style: GoogleFonts.exo(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF1A202C),
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                          if (price > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1D4ED8).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '\$${price.toStringAsFixed(2)}',
                                style: GoogleFonts.exo(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF1D4ED8),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.calendar_today, size: 16, color: Colors.grey.shade600),
                          const SizedBox(width: 6),
                          Text(
                            'Fecha del viaje: $formattedRideDate',
                            style: GoogleFonts.exo(fontSize: 14, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                      if (phoneNumber.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(Icons.phone, size: 16, color: Colors.grey.shade600),
                            const SizedBox(width: 6),
                            Text(
                              phoneNumber,
                              style: GoogleFonts.exo(fontSize: 14, color: Colors.grey.shade600),
                            ),
                          ],
                        ),
                      ],
                      if (flightNumber.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(Icons.flight, size: 16, color: Colors.grey.shade600),
                            const SizedBox(width: 6),
                            Text(
                              'Vuelo: $flightNumber',
                              style: GoogleFonts.exo(fontSize: 14, color: Colors.grey.shade600),
                            ),
                          ],
                        ),
                      ],
                      if (cancellationReason.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Icon(Icons.cancel, size: 16, color: Colors.red.shade600),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Razón: $cancellationReason',
                                style: GoogleFonts.exo(fontSize: 14, color: Colors.red.shade600),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.location_on, size: 16, color: Colors.green.shade600),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              origin,
                              style: GoogleFonts.exo(fontSize: 13, color: Colors.grey.shade700),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.location_on, size: 16, color: Colors.red.shade600),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              destination,
                              style: GoogleFonts.exo(fontSize: 13, color: Colors.grey.shade700),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                // Badge de estado
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.cancel, size: 18, color: Colors.red.shade700),
                      const SizedBox(width: 8),
                      Text(
                        'Cancelado',
                        style: GoogleFonts.exo(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.red.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBottomActions() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        ElevatedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.download),
          label: const Text('Export'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.grey.shade700,
            foregroundColor: Colors.white,
          ),
        ),
        Row(
          children: [
            TextButton(onPressed: null, child: const Text('Previous')),
            const SizedBox(width: 8),
            TextButton(onPressed: null, child: const Text('Next')),
          ],
        ),
      ],
    );
  }
}
