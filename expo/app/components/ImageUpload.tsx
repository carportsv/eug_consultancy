import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { uploadDriverPhoto, uploadPlatePhoto, uploadVehiclePhoto } from '../services/imageService';
import { uploadImageDirect } from '../services/directStorageService';

interface ImageUploadProps {
  title: string;
  subtitle: string;
  currentImage?: string;
  onImageSelected: (imageUri: string) => void;
  placeholderIcon: keyof typeof MaterialIcons.glyphMap;
  imageStyle?: 'round' | 'square';
  uploadType?: 'driver' | 'vehicle' | 'plate';
}

export default function ImageUpload({
  title,
  subtitle,
  currentImage,
  onImageSelected,
  placeholderIcon,
  imageStyle = 'square',
  uploadType = 'driver'
}: ImageUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permisos Requeridos',
        'Necesitamos acceso a la cámara y galería para subir fotos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const uploadToFirebase = async (imageUri: string) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    setIsUploading(true);
    try {
      console.log(`[ImageUpload] 📸 Iniciando subida de imagen para ${uploadType}...`);
      let uploadResult;
      
      try {
        // Intentar con los servicios normales primero
        console.log(`[ImageUpload] 🔄 Intentando con servicio estándar para ${uploadType}...`);
        switch (uploadType) {
          case 'driver':
            uploadResult = await uploadDriverPhoto(imageUri, user.uid);
            break;
          case 'vehicle':
            uploadResult = await uploadVehiclePhoto(imageUri, user.uid);
            break;
          case 'plate':
            uploadResult = await uploadPlatePhoto(imageUri, user.uid);
            break;
          default:
            uploadResult = await uploadDriverPhoto(imageUri, user.uid);
        }
        
        console.log(`[ImageUpload] 📊 Resultado servicio estándar:`, uploadResult);
      } catch (serviceError) {
        console.warn(`[ImageUpload] ⚠️ Error en servicio estándar:`, serviceError);
        uploadResult = { 
          success: false, 
          error: serviceError instanceof Error ? serviceError.message : 'Error en servicio estándar' 
        };
      }

      // Si falla con "Network request failed", intentar con upload directo
      if (!uploadResult.success && (
          uploadResult.error?.includes('Network request failed') ||
          uploadResult.error?.includes('Error en servicio estándar')
        )) {
        try {
          console.log(`[ImageUpload] 🔄 Intentando con upload directo para ${uploadType}...`);
          uploadResult = await uploadImageDirect(imageUri, user.uid, uploadType);
          console.log(`[ImageUpload] 📊 Resultado upload directo:`, uploadResult);
        } catch (directError) {
          console.error(`[ImageUpload] ❌ Error en upload directo:`, directError);
          uploadResult = { 
            success: false, 
            error: directError instanceof Error ? directError.message : 'Error en upload directo' 
          };
        }
      }

      if (uploadResult.success && uploadResult.url) {
        console.log(`[ImageUpload] ✅ Subida exitosa: ${uploadResult.url}`);
        onImageSelected(uploadResult.url);
        Alert.alert('Éxito', 'Imagen subida correctamente');
      } else {
        console.error(`[ImageUpload] ❌ Subida falló:`, uploadResult.error);
        Alert.alert('Error', uploadResult.error || 'Error al subir la imagen');
      }
    } catch (error) {
      console.error('[ImageUpload] ❌ Error crítico al subir imagen:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      if (errorMessage.includes('Network request failed')) {
        Alert.alert('Error de Red', 'Problema de conectividad. Verifica tu conexión e intenta de nuevo.');
      } else {
        Alert.alert('Error', 'Error inesperado al subir la imagen. Intenta de nuevo.');
      }
    } finally {
      setIsUploading(false);
      console.log(`[ImageUpload] 🏁 Proceso de subida finalizado`);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setIsUploading(true);
      console.log('[ImageUpload] 📷 Abriendo cámara...');
      
      // USAR LA MISMA CONFIGURACIÓN QUE FUNCIONA EN SimpleImageUpload
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // Deshabilitamos el editor para evitar crashes
        quality: 0.7, // Reducimos calidad para evitar problemas de memoria
        exif: false, // No incluir datos EXIF
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[ImageUpload] ✅ Foto tomada:', result.assets[0].uri);
        await uploadToFirebase(result.assets[0].uri);
      } else {
        console.log('[ImageUpload] 📷 Toma de foto cancelada por usuario');
      }
    } catch (error) {
      console.error('[ImageUpload] ❌ Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    } finally {
      setIsUploading(false);
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setIsUploading(true);
      console.log('[ImageUpload] 🖼️ Abriendo galería...');
      
      // USAR LA MISMA CONFIGURACIÓN QUE FUNCIONA EN SimpleImageUpload
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // Deshabilitamos el editor para evitar crashes
        quality: 0.7, // Reducimos calidad para evitar problemas de memoria
        exif: false, // No incluir datos EXIF
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[ImageUpload] ✅ Imagen seleccionada:', result.assets[0].uri);
        await uploadToFirebase(result.assets[0].uri);
      } else {
        console.log('[ImageUpload] 🖼️ Selección de imagen cancelada por usuario');
      }
    } catch (error) {
      console.error('[ImageUpload] ❌ Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoUpload = () => {
    if (isUploading) return;
    
    console.log(`[ImageUpload] 📋 Mostrando opciones de subida para ${uploadType}...`);
    Alert.alert(
      'Subir Foto',
      'Selecciona una opción',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cámara', onPress: takePhoto },
        { text: 'Galería', onPress: pickFromGallery }
      ]
    );
  };

  const imageContainerStyle = imageStyle === 'round' ? styles.roundImage : styles.squareImage;
  const imagePreviewStyle = imageStyle === 'round' ? styles.roundPhotoPreview : styles.squarePhotoPreview;

  try {
    return (
      <View style={styles.photoSection}>
        <Text style={styles.photoTitle}>{title}</Text>
        <Text style={styles.photoSubtitle}>{subtitle}</Text>
        
        <View style={styles.photoContainer}>
          {currentImage ? (
            <Image 
              source={{ uri: currentImage }} 
              style={imagePreviewStyle}
              onError={(error) => {
                console.warn('[ImageUpload] ⚠️ Error cargando imagen:', error);
              }}
            />
          ) : (
            <View style={[styles.photoPlaceholder, imageContainerStyle]}>
              <MaterialIcons name={placeholderIcon} size={48} color="#9CA3AF" />
              <Text style={styles.photoPlaceholderText}>Sin foto</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]} 
            onPress={handlePhotoUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="camera-alt" size={20} color="#2563EB" />
                <Text style={styles.uploadButtonText}>
                  {currentImage ? 'Cambiar Foto' : 'Subir Foto'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  } catch (renderError) {
    console.error('[ImageUpload] ❌ Error crítico en render:', renderError);
    return (
      <View style={styles.photoSection}>
        <Text style={styles.photoTitle}>Error de Imagen</Text>
        <Text style={styles.photoSubtitle}>No se pudo cargar el componente</Text>
        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={() => {
            console.log('[ImageUpload] 🔄 Intentando reiniciar componente...');
          }}
        >
          <Text style={styles.uploadButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  photoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  photoSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  photoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundPhotoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
  },
  squarePhotoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roundImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
  },
  squareImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
}); 