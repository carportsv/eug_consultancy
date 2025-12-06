import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:google_fonts/google_fonts.dart';

/// Widget para elementos de navegación con efecto hover y elevación
/// Extraído de welcome_screen.dart
class HoverableNavItem extends StatefulWidget {
  final String text;
  final VoidCallback onTap;
  final Color textColor;

  const HoverableNavItem({
    super.key,
    required this.text,
    required this.onTap,
    this.textColor = Colors.white,
  });

  @override
  State<HoverableNavItem> createState() => _HoverableNavItemState();
}

class _HoverableNavItemState extends State<HoverableNavItem> with SingleTickerProviderStateMixin {
  bool _isHovered = false;
  late AnimationController _controller;
  late Animation<double> _elevationAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(duration: const Duration(milliseconds: 200), vsync: this);
    _elevationAnimation = CurvedAnimation(parent: _controller, curve: Curves.easeInOut);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleTap() {
    if (kDebugMode) {
      debugPrint('[HoverableNavItem] Tap en: ${widget.text}');
    }
    widget.onTap();
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) {
        setState(() => _isHovered = true);
        _controller.forward();
      },
      onExit: (_) {
        setState(() => _isHovered = false);
        _controller.reverse();
      },
      child: GestureDetector(
        onTap: _handleTap,
        child: AnimatedBuilder(
          animation: _elevationAnimation,
          builder: (context, child) {
            final elevation = _elevationAnimation.value;
            final shadowOffset = 2.0 + (elevation * 3.0); // De 2 a 5
            final shadowBlur = 5.0 + (elevation * 10.0); // De 5 a 15
            final shadowAlpha = 0.1 + (elevation * 0.15); // De 0.1 a 0.25

            return Transform.translate(
              offset: Offset(0, -elevation * 2), // Se eleva hasta 2px
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border(
                    bottom: BorderSide(
                      color: _isHovered ? widget.textColor : Colors.transparent,
                      width: 2,
                    ),
                  ),
                  boxShadow: _isHovered
                      ? [
                          BoxShadow(
                            color: widget.textColor.withValues(alpha: shadowAlpha * 0.5),
                            blurRadius: shadowBlur,
                            offset: Offset(0, shadowOffset),
                            spreadRadius: elevation * 1.5,
                          ),
                          BoxShadow(
                            color: Colors.black.withValues(alpha: shadowAlpha * 0.3),
                            blurRadius: shadowBlur * 0.8,
                            offset: Offset(0, shadowOffset * 0.8),
                            spreadRadius: elevation,
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  widget.text,
                  style: GoogleFonts.exo(
                    color: widget.textColor,
                    fontSize: 14,
                    fontWeight: _isHovered ? FontWeight.w600 : FontWeight.w500,
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
