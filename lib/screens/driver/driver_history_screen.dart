import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/cupertino.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../auth/supabase_service.dart';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';

class DriverHistoryScreen extends StatefulWidget {
  const DriverHistoryScreen({super.key});

  @override
  State<DriverHistoryScreen> createState() => _DriverHistoryScreenState();
}

class _DriverHistoryScreenState extends State<DriverHistoryScreen> {
  final SupabaseService _supabaseService = SupabaseService();
  String? _driverId;
  List<Map<String, dynamic>> _rides = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDriverId();
  }

  Future<void> _loadDriverId() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      final supabaseClient = _supabaseService.client;

      final userResponse = await supabaseClient
          .from('users')
          .select('id')
          .eq('firebase_uid', user.uid)
          .maybeSingle();

      if (userResponse != null) {
        final userId = userResponse['id'] as String?;

        if (userId != null) {
          final driverResponse = await supabaseClient
              .from('drivers')
              .select('id')
              .eq('user_id', userId)
              .maybeSingle();

          if (driverResponse != null) {
            final driverId = driverResponse['id'] as String?;
            if (driverId != null) {
              setState(() => _driverId = driverId);
              _loadHistory();
            }
          }
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[DriverHistory] Error cargando driver_id: $e');
      }
    }
  }

  Future<void> _loadHistory() async {
    if (_driverId == null) return;

    setState(() => _isLoading = true);

    try {
      final supabaseClient = _supabaseService.client;

      final rides = await supabaseClient
          .from('ride_requests')
          .select('''
            *,
            user:users!ride_requests_user_id_fkey(id, email, display_name, phone_number)
          ''')
          .eq('driver_id', _driverId!)
          .or('status.eq.accepted,status.eq.in_progress,status.eq.completed,status.eq.cancelled')
          .order('created_at', ascending: false)
          .limit(50);

      if (mounted) {
        setState(() {
          _rides = (rides as List).cast<Map<String, dynamic>>();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[DriverHistory] Error cargando historial: $e');
      }
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'completed':
        return CupertinoColors.systemGreen;
      case 'cancelled':
        return CupertinoColors.destructiveRed;
      case 'in_progress':
        return CupertinoColors.activeBlue;
      case 'accepted':
        return CupertinoColors.systemOrange;
      default:
        return CupertinoColors.systemGrey;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      case 'in_progress':
        return 'En Progreso';
      case 'accepted':
        return 'Aceptado';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text('Historial de Viajes', style: GoogleFonts.exo(fontWeight: FontWeight.w600)),
        backgroundColor: CupertinoColors.systemBackground,
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          minimumSize: Size.zero,
          onPressed: _loadHistory,
          child: const Icon(CupertinoIcons.refresh, size: 22),
        ),
      ),
      child: SafeArea(
        child: _isLoading
            ? const Center(child: CupertinoActivityIndicator(radius: 16))
            : _rides.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(CupertinoIcons.clock, size: 80, color: CupertinoColors.tertiaryLabel),
                    const SizedBox(height: 16),
                    Text(
                      'No hay viajes en el historial',
                      style: GoogleFonts.exo(
                        fontSize: 18,
                        color: CupertinoColors.label,
                        fontWeight: FontWeight.w600,
                        decoration: TextDecoration.none,
                      ),
                    ),
                  ],
                ),
              )
            : CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                slivers: [
                  CupertinoSliverRefreshControl(onRefresh: _loadHistory),
                  SliverPadding(
                    padding: const EdgeInsets.all(16),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate((context, index) {
                        final ride = _rides[index];
                        final origin = ride['origin'] as Map?;
                        final destination = ride['destination'] as Map?;
                        final user = ride['user'] as Map?;
                        final status = ride['status']?.toString() ?? 'unknown';
                        final createdAt = ride['created_at']?.toString();

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: CupertinoColors.systemBackground,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: _getStatusColor(status).withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        _getStatusText(status),
                                        style: GoogleFonts.exo(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: _getStatusColor(status),
                                          decoration: TextDecoration.none,
                                        ),
                                      ),
                                    ),
                                    const Spacer(),
                                    if (createdAt != null)
                                      Text(
                                        DateFormat(
                                          'dd/MM/yyyy HH:mm',
                                        ).format(DateTime.parse(createdAt)),
                                        style: GoogleFonts.exo(
                                          fontSize: 12,
                                          color: CupertinoColors.secondaryLabel,
                                          decoration: TextDecoration.none,
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Icon(
                                      CupertinoIcons.location,
                                      size: 20,
                                      color: CupertinoColors.activeBlue,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        origin?['address']?.toString() ?? 'Origen no especificado',
                                        style: GoogleFonts.exo(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w500,
                                          color: CupertinoColors.label,
                                          decoration: TextDecoration.none,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Icon(
                                      CupertinoIcons.location_solid,
                                      size: 20,
                                      color: CupertinoColors.destructiveRed,
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        destination?['address']?.toString() ??
                                            'Destino no especificado',
                                        style: GoogleFonts.exo(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w500,
                                          color: CupertinoColors.label,
                                          decoration: TextDecoration.none,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Icon(
                                      CupertinoIcons.person,
                                      size: 16,
                                      color: CupertinoColors.secondaryLabel,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      user?['display_name']?.toString() ??
                                          user?['email']?.toString() ??
                                          'Usuario',
                                      style: GoogleFonts.exo(
                                        fontSize: 14,
                                        color: CupertinoColors.secondaryLabel,
                                        decoration: TextDecoration.none,
                                      ),
                                    ),
                                    if (ride['price'] != null) ...[
                                      const Spacer(),
                                      Text(
                                        '\$${ride['price'].toStringAsFixed(2)}',
                                        style: GoogleFonts.exo(
                                          fontSize: 17,
                                          fontWeight: FontWeight.bold,
                                          color: CupertinoColors.systemGreen,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }, childCount: _rides.length),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
