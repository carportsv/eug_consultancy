// Servicio de storage directo usando fetch en lugar del cliente Supabase
// Para solucionar problemas de networking en React Native

interface DirectUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const uploadImageDirect = async (
  imageUri: string,
  userId: string,
  type: 'driver' | 'vehicle' | 'plate' = 'vehicle'
): Promise<DirectUploadResult> => {
  try {
    console.log('[DirectStorage] Iniciando subida directa...');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Variables de entorno de Supabase no configuradas');
    }

    // 1. Leer la imagen
    console.log('[DirectStorage] Leyendo imagen desde:', imageUri);
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`Error leyendo imagen: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log('[DirectStorage] Imagen leída - Tamaño:', blob.size, 'bytes');

    // 2. Crear nombre del archivo según el tipo
    const fileName = `${type}_${Date.now()}.jpg`;
    const filePath = `${userId}/${fileName}`;
    
    console.log('[DirectStorage] Subiendo a ruta:', filePath);

    // 3. Subir usando fetch directo a la API de Supabase Storage
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/images/${filePath}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': blob.type || 'image/jpeg',
        'x-upsert': 'false'
      },
      body: blob
    });

    console.log('[DirectStorage] Respuesta del servidor:', uploadResponse.status);
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[DirectStorage] Error del servidor:', errorText);
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    // 4. Generar URL pública
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${filePath}`;
    
    console.log('[DirectStorage] ✅ Subida exitosa - URL:', publicUrl);

    return {
      success: true,
      url: publicUrl
    };

  } catch (error) {
    console.error('[DirectStorage] ❌ Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};
