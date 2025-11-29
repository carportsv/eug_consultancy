// Archivo solo para web - contiene la función JS interop
import 'dart:js_interop';

// Función top-level para JS interop (solo disponible en web)
@JS('firebaseAuthSignInWithGoogle')
external JSPromise<JSObject?> firebaseAuthSignInWithGoogleJS(JSObject config);

// Wrapper functions para jsify y dartify
JSObject jsify(Object? object) => object.jsify() as JSObject;
Object? dartify(JSObject object) => object.dartify();
