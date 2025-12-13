// Implementación para web usando dart:html
// Este archivo solo se importa cuando se compila para web
// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter

import 'dart:html' as html;

// Redirige a una URL en la misma pestaña usando window.location
void redirectToUrlWeb(String url) {
  html.window.location.href = url;
}
