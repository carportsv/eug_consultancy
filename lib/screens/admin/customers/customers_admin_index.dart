import 'package:flutter/material.dart';
import 'customers_list_screen.dart';
import '../../../auth/supabase_service.dart';

class CustomersAdminIndex extends StatefulWidget {
  const CustomersAdminIndex({super.key});

  @override
  State<CustomersAdminIndex> createState() => _CustomersAdminIndexState();
}

class _CustomersAdminIndexState extends State<CustomersAdminIndex> {
  final SupabaseService _supabaseService = SupabaseService();
  final Map<String, int> _stats = {
    'active': 0,
    'suspended': 0,
    'pending': 0,
    'deleted': 0,
    'deletion_requests': 0,
  };
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    try {
      setState(() => _loading = true);
      final supabaseClient = _supabaseService.client;

      final response = await supabaseClient
          .from('users')
          .select('is_active, role')
          .eq('role', 'user');

      final users = response as List;
      setState(() {
        // La tabla users solo tiene is_active (boolean), no status
        final activeUsers = users.where((u) => u['is_active'] == true).length;
        final inactiveUsers = users.where((u) => u['is_active'] == false).length;

        _stats['active'] = activeUsers;
        _stats['suspended'] = 0; // Por ahora 0, se puede implementar después con otra columna
        _stats['pending'] = 0; // Por ahora 0, se puede implementar después con otra columna
        _stats['deleted'] = inactiveUsers;
        _stats['deletion_requests'] = 0; // Por ahora 0, se puede implementar después
      });
    } catch (e) {
      debugPrint('Error cargando estadísticas: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _navigateToStatus(String status) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => CustomersListScreen(status: status)),
    );
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
                children: [
                  const Icon(Icons.person_search, color: Color(0xFF1A202C), size: 28),
                  const SizedBox(width: 8),
                  Text(
                    'Customers',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1A202C),
                      fontSize: isTablet ? null : 24,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.keyboard_arrow_down, color: Color(0xFF1A202C), size: 24),
                ],
              ),
              const SizedBox(height: 24),
              if (_loading)
                const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
              else
                Expanded(
                  child: ListView(
                    children: [
                      _buildCategoryItem(
                        'Active',
                        _stats['active'] ?? 0,
                        Icons.check_circle,
                        const Color(0xFF4CAF50),
                        () => _navigateToStatus('active'),
                      ),
                      _buildCategoryItem(
                        'Suspended',
                        _stats['suspended'] ?? 0,
                        Icons.block,
                        const Color(0xFFFF9800),
                        () => _navigateToStatus('suspended'),
                      ),
                      _buildCategoryItem(
                        'Pending',
                        _stats['pending'] ?? 0,
                        Icons.schedule,
                        const Color(0xFF2196F3),
                        () => _navigateToStatus('pending'),
                      ),
                      _buildCategoryItem(
                        'Deleted',
                        _stats['deleted'] ?? 0,
                        Icons.delete,
                        const Color(0xFFF44336),
                        () => _navigateToStatus('deleted'),
                      ),
                      _buildCategoryItem(
                        'Deletion Requests',
                        _stats['deletion_requests'] ?? 0,
                        Icons.delete_outline,
                        const Color(0xFF9E9E9E),
                        () => _navigateToStatus('deletion_requests'),
                        isLast: true,
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryItem(
    String title,
    int count, // Mantenemos el parámetro pero no lo usamos
    IconData icon,
    Color color,
    VoidCallback onTap, {
    bool isLast = false,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 32),
        decoration: BoxDecoration(
          border: isLast ? null : Border(bottom: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF1A202C),
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
