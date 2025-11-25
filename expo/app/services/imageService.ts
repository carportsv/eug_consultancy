import { ImageOptimizationService } from './imageOptimization';
import { supabase } from './supabaseClient';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadImage = async (
  imageUri: string, 
  folder: string, 
  fileName: string,
  optimize: boolean = true
): Promise<UploadResult> => {
  try {
    let finalImageUri = imageUri;
    
    // Optimizar imagen automáticamente si está habilitado
    if (optimize) {
      console.log('🖼️ Optimizando imagen antes de subir...');
      try {
        finalImageUri = await ImageOptimizationService.optimizeImage(imageUri);
        console.log('✅ Imagen optimizada exitosamente');
      } catch (optimizeError) {
        console.warn('⚠️ Error optimizando imagen, usando original:', optimizeError);
        finalImageUri = imageUri;
      }
    }

    // Convertir la URI de la imagen a blob
    const response = await fetch(finalImageUri);
    const blob = await response.blob();
    
    // Crear la ruta completa en Supabase Storage
    const filePath = `${folder}/${fileName}`;
    
    // Subir el archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading image to Supabase:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    // Obtener la URL pública de descarga
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
    
    return {
      success: true,
      url: urlData.publicUrl
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

export const uploadDriverPhoto = async (imageUri: string, userId: string): Promise<UploadResult> => {
  const fileName = `driver_${userId}_${Date.now()}.jpg`;
  return uploadImage(imageUri, 'driver-photos', fileName, true);
};

export const uploadVehiclePhoto = async (imageUri: string, userId: string): Promise<UploadResult> => {
  const fileName = `vehicle_${userId}_${Date.now()}.jpg`;
  return uploadImage(imageUri, 'vehicle-photos', fileName, true);
};

export const uploadPlatePhoto = async (imageUri: string, userId: string): Promise<UploadResult> => {
  const fileName = `plate_${userId}_${Date.now()}.jpg`;
  return uploadImage(imageUri, 'plate-photos', fileName, true);
};

export const uploadProfilePhoto = async (imageUri: string, userId: string): Promise<UploadResult> => {
  const fileName = `profile_${userId}_${Date.now()}.jpg`;
  return uploadImage(imageUri, 'profile-photos', fileName, true);
};

export const deleteImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extraer la ruta del archivo de la URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const folder = urlParts[urlParts.length - 2];
    const filePath = `${folder}/${fileName}`;
    
    const { error } = await supabase.storage
      .from('images')
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting image from Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}; 