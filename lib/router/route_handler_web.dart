// Implementación para web usando dart:html
// Este archivo solo se importa cuando se compila para web
// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter

import 'dart:html' as html show window;

// Obtener el hash de window.location (solo web)
String getHashFromWindow() {
  try {
    final hash = html.window.location.hash;
    // Remover el # inicial si está presente
    return hash.startsWith('#') ? hash.substring(1) : hash;
  } catch (e) {
    return '';
  }
}
