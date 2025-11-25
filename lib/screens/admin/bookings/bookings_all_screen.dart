import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class BookingsAllScreen extends StatefulWidget {
  const BookingsAllScreen({super.key});

  @override
  State<BookingsAllScreen> createState() => _BookingsAllScreenState();
}

class _BookingsAllScreenState extends State<BookingsAllScreen> {
  // ignore: unused_field
  String _searchTerm = ''; // Se usará cuando se implemente la funcionalidad de búsqueda
  int _recordsPerPage = 10;
  String? _selectedDate;
  String? _selectedCustomer;
  String? _selectedDriver;

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
                    'Bookings - All',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1A202C),
                      fontSize: isTablet ? null : 20,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.keyboard),
                    onPressed: () {},
                    tooltip: 'Keyboard shortcuts',
                  ),
                ],
              ),
              SizedBox(height: isTablet ? 24 : 16),
              _buildControls(isTablet),
              SizedBox(height: isTablet ? 24 : 16),
              Expanded(child: _buildBookingsTable()),
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
                  onPressed: () => setState(() => _selectedDate = null),
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
        onChanged: (value) => setState(() => _searchTerm = value.toLowerCase()),
      ),
    );
  }

  Widget _buildBookingsTable() {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildTableHeader(),
          Container(constraints: const BoxConstraints(minHeight: 200), child: _buildTableContent()),
        ],
      ),
    );
  }

  Widget _buildTableHeader() {
    final screenWidth = MediaQuery.of(context).size.width;
    final isTablet = screenWidth > 900;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1D4ED8),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(8),
          topRight: Radius.circular(8),
        ),
      ),
      child: isTablet
          ? Row(
              children: [
                _buildHeaderCell('Order No.', flex: 1),
                _buildHeaderCell('Passenger', flex: 1),
                _buildHeaderCell('Date & Time', flex: 1),
                _buildHeaderCell('Pick Up', flex: 2),
                _buildHeaderCell('Drop Off', flex: 2),
                _buildHeaderCell('Vehicle', flex: 1),
                _buildHeaderCell('Payment', flex: 1),
                _buildHeaderCell('Fare', flex: 1),
                _buildHeaderCell('Driver', flex: 1),
                _buildHeaderCell('Status', flex: 1),
              ],
            )
          : const Text(
              'Bookings',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
    );
  }

  Widget _buildHeaderCell(String text, {int flex = 1}) {
    return Expanded(
      flex: flex,
      child: Text(
        text,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
      ),
    );
  }

  Widget _buildTableContent() {
    // all: Implementar carga de datos desde Supabase
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32.0),
      child: const Center(
        child: Text('No Records', style: TextStyle(color: Colors.grey, fontSize: 16)),
      ),
    );
  }

  Widget _buildBottomActions() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        ElevatedButton.icon(
          onPressed: () {
            // all: Implementar exportación
          },
          icon: const Icon(Icons.download),
          label: const Text('Export'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.grey.shade700,
            foregroundColor: Colors.white,
          ),
        ),
        Row(
          children: [
            TextButton(
              onPressed: () {
                // all: Implementar paginación anterior
              },
              child: const Text('Previous'),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF1D4ED8),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                '1',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 8),
            TextButton(
              onPressed: () {
                // all: Implementar paginación siguiente
              },
              child: const Text('Next'),
            ),
          ],
        ),
      ],
    );
  }
}
