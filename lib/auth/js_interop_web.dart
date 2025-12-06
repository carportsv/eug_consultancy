// Archivo solo para web - contiene la función JS interop
import 'dart:async';
import 'dart:js_interop';

// Función helper para llamar then en una promesa usando interop
void _callPromiseThen(JSObject promise, JSFunction onResolve, JSFunction onReject) {
  // Acceder al método then de la promesa y llamarlo
  // En JS: promise.then(onResolve, onReject)
  final thenMethod = (promise as dynamic).then;
  if (thenMethod != null && thenMethod is Function) {
    thenMethod(onResolve, onReject);
  }
}

// Extensión para convertir JSPromise a Future
// Esta extensión debe estar disponible cuando se importa este archivo
extension JSPromiseExtension<T extends JSAny?> on JSPromise<T> {
  Future<T> get toDart {
    final completer = Completer<T>();
    final promise = this as JSObject;

    // Crear funciones JS para manejar resolve y reject
    final onResolve = ((T result) {
      if (!completer.isCompleted) {
        completer.complete(result);
      }
    }).toJS;

    final onReject = ((JSAny? error) {
      if (!completer.isCompleted) {
        final errorObj = error?.dartify();
        completer.completeError(errorObj ?? 'Unknown error');
      }
    }).toJS;

    // Llamar a then usando la función helper
    _callPromiseThen(promise, onResolve, onReject);

    return completer.future;
  }
}

// Función top-level para JS interop (solo disponible en web)
@JS('firebaseAuthSignInWithGoogle')
external JSPromise<JSObject?> firebaseAuthSignInWithGoogleJS(JSObject config);

// Wrapper functions para jsify y dartify
JSObject jsify(Object? object) => object.jsify() as JSObject;
Object? dartify(JSObject object) => object.dartify();
