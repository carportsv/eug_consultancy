import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

/// Widget que muestra un CircleAvatar con manejo seguro de errores de red
/// Previene que los errores 429 (Too Many Requests) se muestren en la consola
class SafeCircleAvatar extends StatelessWidget {
  final String? imageUrl;
  final double radius;
  final Color? backgroundColor;
  final Widget? child;
  final Color? iconColor;
  final IconData icon;

  const SafeCircleAvatar({
    super.key,
    this.imageUrl,
    required this.radius,
    this.backgroundColor,
    this.child,
    this.iconColor,
    this.icon = Icons.person,
  });

  @override
  Widget build(BuildContext context) {
    // Si no hay URL, mostrar solo el icono
    if (imageUrl == null || imageUrl!.isEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundColor: backgroundColor,
        child: child ?? Icon(icon, color: iconColor, size: radius),
      );
    }

    // Usar Image.network con errorBuilder para manejar errores silenciosamente
    return ClipOval(
      child: Image.network(
        imageUrl!,
        width: radius * 2,
        height: radius * 2,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          // No loguear errores 429 (Too Many Requests) - son temporales
          if (error is NetworkImageLoadException) {
            final statusCode = error.statusCode;
            if (statusCode == 429) {
              // Error de rate limiting - silencioso, solo mostrar fallback
              if (kDebugMode) {
                // Solo loguear en modo debug, no en producción
                debugPrint('[SafeCircleAvatar] Error 429 (rate limit) para: $imageUrl');
              }
            } else if (kDebugMode) {
              // Solo loguear otros errores en modo debug
              debugPrint('[SafeCircleAvatar] Error cargando imagen: $error');
            }
          }
          // Mostrar fallback
          return Container(
            width: radius * 2,
            height: radius * 2,
            color: backgroundColor ?? Colors.grey.shade300,
            child: child ?? Icon(icon, color: iconColor, size: radius),
          );
        },
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) {
            return child;
          }
          // Mostrar fallback mientras carga
          return Container(
            width: radius * 2,
            height: radius * 2,
            color: backgroundColor ?? Colors.grey.shade300,
            child: Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                value: loadingProgress.expectedTotalBytes != null
                    ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                    : null,
              ),
            ),
          );
        },
      ),
    );
  }
}
