import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:google_fonts/google_fonts.dart';

class DriverAvailabilityScreen extends StatefulWidget {
  const DriverAvailabilityScreen({super.key});

  @override
  State<DriverAvailabilityScreen> createState() => _DriverAvailabilityScreenState();
}

class _DriverAvailabilityScreenState extends State<DriverAvailabilityScreen> {
  bool _isAvailable = false;

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      navigationBar: CupertinoNavigationBar(
        middle: Text('Disponibilidad', style: GoogleFonts.exo(fontWeight: FontWeight.w600)),
        backgroundColor: CupertinoColors.systemBackground,
      ),
      child: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: (_isAvailable ? CupertinoColors.systemGreen : CupertinoColors.systemGrey)
                      .withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _isAvailable ? CupertinoIcons.check_mark_circled : CupertinoIcons.clear_circled,
                  size: 80,
                  color: _isAvailable ? CupertinoColors.systemGreen : CupertinoColors.systemGrey,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                _isAvailable ? 'Disponible' : 'No Disponible',
                style: GoogleFonts.exo(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: _isAvailable
                      ? CupertinoColors.systemGreen
                      : CupertinoColors.secondaryLabel,
                  decoration: TextDecoration.none,
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  _isAvailable
                      ? 'Estás recibiendo solicitudes de viajes'
                      : 'No estás recibiendo solicitudes de viajes',
                  style: GoogleFonts.exo(
                    fontSize: 16,
                    color: CupertinoColors.secondaryLabel,
                    height: 1.4,
                    decoration: TextDecoration.none,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 32),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: SizedBox(
                  width: double.infinity,
                  child: CupertinoButton(
                    onPressed: () {
                      setState(() => _isAvailable = !_isAvailable);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            _isAvailable ? 'Disponibilidad activada' : 'Disponibilidad desactivada',
                            style: GoogleFonts.exo(),
                          ),
                          backgroundColor: _isAvailable
                              ? CupertinoColors.systemGreen
                              : CupertinoColors.systemOrange,
                        ),
                      );
                    },
                    color: _isAvailable
                        ? CupertinoColors.destructiveRed
                        : CupertinoColors.systemGreen,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Text(
                      _isAvailable ? 'Desactivar Disponibilidad' : 'Activar Disponibilidad',
                      style: GoogleFonts.exo(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        color: CupertinoColors.white,
                        decoration: TextDecoration.none,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
