import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export class ImageOptimizationService {
  
  // Optimizar imagen antes de subir
  static async optimizeImage(uri: string, options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  } = {}) {
    try {
      const {
        maxWidth = 800,
        maxHeight = 800,
        quality = 0.8,
        format = 'jpeg'
      } = options;

      console.log('🖼️ Optimizando imagen:', { uri, maxWidth, maxHeight, quality, format });

      // Comprimir y redimensionar imagen
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: maxWidth,
              height: maxHeight,
            },
          },
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat[format.toUpperCase() as keyof typeof ImageManipulator.SaveFormat],
        }
      );

      console.log('✅ Imagen optimizada:', {
        originalSize: await this.getFileSize(uri),
        optimizedSize: await this.getFileSize(result.uri),
        compression: `${((1 - (await this.getFileSize(result.uri) / await this.getFileSize(uri))) * 100).toFixed(1)}%`
      });

      return result.uri;
    } catch (error) {
      console.error('❌ Error optimizando imagen:', error);
      return uri; // Retornar original si falla
    }
  }

  // Obtener tamaño de archivo
  static async getFileSize(uri: string): Promise<number> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      console.warn('⚠️ No se pudo obtener tamaño de archivo:', error);
      return 0;
    }
  }

  // Configuraciones específicas por tipo de imagen
  static readonly CONFIGS = {
    PROFILE_PHOTO: {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.8,
      format: 'jpeg' as const
    },
    VEHICLE_PHOTO: {
      maxWidth: 600,
      maxHeight: 600,
      quality: 0.85,
      format: 'jpeg' as const
    },
    PLATE_PHOTO: {
      maxWidth: 800,
      maxHeight: 600,
      quality: 0.9,
      format: 'jpeg' as const
    },
    DOCUMENT_PHOTO: {
      maxWidth: 1000,
      maxHeight: 1000,
      quality: 0.9,
      format: 'jpeg' as const
    }
  };

  // Optimizar según tipo
  static async optimizeByType(uri: string, type: keyof typeof ImageOptimizationService.CONFIGS) {
    const config = this.CONFIGS[type];
    return this.optimizeImage(uri, config);
  }

  // Limpiar imágenes temporales
  static async cleanupTempImages() {
    try {
      // En React Native, las imágenes temporales se limpian automáticamente
      // pero podemos forzar la limpieza del cache
      if (Platform.OS === 'ios') {
        // iOS limpia automáticamente
        console.log('🧹 Limpieza automática en iOS');
      } else {
        // Android puede necesitar limpieza manual
        console.log('🧹 Limpieza automática en Android');
      }
    } catch (error) {
      console.warn('⚠️ Error en limpieza de imágenes temporales:', error);
    }
  }
} 