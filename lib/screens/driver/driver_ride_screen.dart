import 'package:flutter/cupertino.dart';
import 'package:google_fonts/google_fonts.dart';

class DriverRideScreen extends StatefulWidget {
  final String rideId;

  const DriverRideScreen({super.key, required this.rideId});

  @override
  State<DriverRideScreen> createState() => _DriverRideScreenState();
}

class _DriverRideScreenState extends State<DriverRideScreen> {
  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text('Viaje Activo', style: GoogleFonts.exo(fontWeight: FontWeight.w600)),
        backgroundColor: CupertinoColors.systemBackground,
      ),
      child: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: CupertinoColors.activeBlue.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(CupertinoIcons.car, size: 60, color: CupertinoColors.activeBlue),
              ),
              const SizedBox(height: 24),
              Text(
                'Viaje ID: ${widget.rideId}',
                style: GoogleFonts.exo(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: CupertinoColors.label,
                  decoration: TextDecoration.none,
                ),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  'Pantalla de gestión de viaje en desarrollo',
                  style: GoogleFonts.exo(
                    fontSize: 15,
                    color: CupertinoColors.secondaryLabel,
                    height: 1.4,
                    decoration: TextDecoration.none,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
