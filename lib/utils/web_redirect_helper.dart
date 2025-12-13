import 'package:flutter/foundation.dart';

/// Helper para redirección en web usando importación condicional
/// Evita usar dart:html directamente que está deprecado

// Importación condicional: solo importa dart:html en web
import 'web_redirect_helper_stub.dart'
    if (dart.library.html) 'web_redirect_helper_web.dart'
    as web_redirect;

/// Redirige a una URL en la misma pestaña (solo funciona en web)
/// En móvil, no hace nada
void redirectToUrl(String url) {
  if (kIsWeb) {
    web_redirect.redirectToUrlWeb(url);
  }
}
