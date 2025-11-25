import { supabase } from './supabaseClient';
import { getAuthInstanceAsync } from './firebaseConfig';

export interface StorageResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Verifica que el bucket 'images' sea accesible y autentica al usuario
 */
export const ensureImagesBucket = async (): Promise<boolean> => {
  try {
    console.log('[Storage] Verificando acceso al bucket "images"...');
    
    // Primero, asegurar autenticación con Supabase usando token de Firebase
    await ensureSupabaseAuth();
    
    // Intentar listar archivos en el bucket para verificar acceso
    const { data, error } = await supabase.storage
      .from('images')
      .list('', { limit: 1 });
    
    if (error) {
      console.error('[Storage] Bucket "images" no es accesible:', error.message);
      console.log('[Storage] 💡 Asegúrate de que el bucket "images" existe en el panel de Supabase');
      return false;
    }
    
    console.log('[Storage] ✅ Bucket "images" es accesible');
    return true;
  } catch (error) {
    console.error('[Storage] Error verificando bucket:', error);
    return false;
  }
};

/**
 * Asegura que el usuario esté autenticado en Supabase usando su token de Firebase
 */
const ensureSupabaseAuth = async (): Promise<void> => {
  try {
    // Verificar si ya hay una sesión activa en Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      console.log('[Storage] ✅ Usuario ya autenticado en Supabase:', session.user.email);
      return;
    }
    
    console.log('[Storage] 🔐 Autenticando usuario en Supabase con token de Firebase...');
    
    // Obtener token de Firebase
    const auth = await getAuthInstanceAsync();
    const firebaseUser = auth.currentUser;
    
    if (!firebaseUser) {
      throw new Error('Usuario no autenticado en Firebase');
    }
    
    const idToken = await firebaseUser.getIdToken();
    console.log('[Storage] 🎫 Token de Firebase obtenido para:', firebaseUser.email);
    
    // Intentar autenticar en Supabase usando custom token
    // Nota: Esto requiere configuración JWT en Supabase
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'firebase' as any,
        token: idToken
      });
      
      if (authError) {
        console.warn('[Storage] ⚠️ No se pudo autenticar con custom token:', authError.message);
        console.log('[Storage] 📱 Continuando con política para usuarios anónimos');
      } else {
        console.log('[Storage] ✅ Usuario autenticado en Supabase exitosamente:', authData.user?.email);
      }
    } catch (tokenError) {
      console.warn('[Storage] ⚠️ Custom token no soportado, usando política anónima');
    }
    
  } catch (error) {
    console.error('[Storage] ⚠️ Error en autenticación:', error);
    console.log('[Storage] 📱 Continuando con políticas RLS existentes');
  }
};

/**
 * Sube una imagen al bucket de imágenes con reintentos automáticos
 */
export const uploadImage = async (
  imageUri: string,
  folder: string,
  fileName: string,
  retries: number = 3
): Promise<StorageResult> => {
  console.log('[Storage] Iniciando subida de imagen...');

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Storage] Intento ${attempt}/${retries} - Subiendo imagen...`);
      
      // Convertir URI a blob con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(imageUri, { 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Error al leer imagen: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log(`[Storage] Blob creado - Tamaño: ${blob.size} bytes, Tipo: ${blob.type}`);
      
      // Crear ruta del archivo
      const filePath = `${folder}/${fileName}`;
      
      // Subir archivo siguiendo recomendaciones de Supabase
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,  // evita sobreescribir archivos
          contentType: blob.type || 'image/jpeg'  // Asegurar content-type
        });
      
      if (error) {
        console.error(`[Storage] Error en intento ${attempt}:`, error);
        console.error(`[Storage] Error detalles:`, {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        // Si es error de red específico, dar más información
        if (error.message?.includes('Network request failed')) {
          console.error(`[Storage] 🌐 Error de red detectado - Verificar:`);
          console.error(`[Storage] - Conexión a internet: ¿Activa?`);
          console.error(`[Storage] - Firewall/VPN: ¿Bloqueando?`);
          console.error(`[Storage] - Red móvil vs WiFi: ¿Diferencias?`);
        }
        
        if (attempt === retries) {
          return {
            success: false,
            error: error.message
          };
        }
        
        // Esperar antes del siguiente intento
        console.log(`[Storage] ⏳ Esperando ${1000 * attempt}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      console.log(`[Storage] ✅ Imagen subida exitosamente: ${urlData.publicUrl}`);
      
      return {
        success: true,
        url: urlData.publicUrl
      };
      
    } catch (error) {
      console.error(`[Storage] Error en intento ${attempt}:`, error);
      
      if (attempt === retries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return {
    success: false,
    error: 'Máximo número de intentos alcanzado'
  };
};

/**
 * Función específica para subir fotos de vehículos
 * Usa estructura recomendada: user_id/filename.jpg
 */
export const uploadVehiclePhoto = async (imageUri: string, userId: string): Promise<StorageResult> => {
  const fileName = `vehicle_${Date.now()}.jpg`;
  return uploadImage(imageUri, userId, fileName);
};
