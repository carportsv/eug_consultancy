import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { uploadVehiclePhoto } from '../services/storageService';
import { uploadImageDirect } from '../services/directStorageService';
import { useAuth } from '../contexts/AuthContext';

interface SimpleImageUploadProps {
  currentImage?: string | null;
  onImageSelected: (imageUri: string) => void;
  placeholder?: string;
  style?: any;
}

export default function SimpleImageUpload({
  currentImage,
  onImageSelected,
  placeholder = "Seleccionar imagen",
  style
}: SimpleImageUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const uploadImageToSupabase = async (imageUri: string) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Usuario no autenticado');
      return;
    }

    try {
      console.log('[SimpleImageUpload] Subiendo imagen a Supabase Storage...');
      let result = await uploadVehiclePhoto(imageUri, user.uid);
      
      // Si falla con el cliente normal, intentar con fetch directo
      if (!result.success && result.error?.includes('Network request failed')) {
        console.log('[SimpleImageUpload] 🔄 Intentando con upload directo...');
        result = await uploadImageDirect(imageUri, user.uid, 'vehicle');
      }
      
      if (result.success && result.url) {
        console.log('[SimpleImageUpload] Imagen subida exitosamente:', result.url);
        onImageSelected(result.url);
        Alert.alert('Éxito', 'Foto subida correctamente');
      } else {
        throw new Error(result.error || 'Error al subir la imagen');
      }
    } catch (error) {
      console.error('[SimpleImageUpload] Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // Mostrar mensaje más amigable para errores de red
      let userMessage = `No se pudo subir la imagen: ${errorMessage}`;
      if (errorMessage.includes('Network request failed')) {
        userMessage = 'Problema de conectividad. Intenta de nuevo.';
      } else if (errorMessage.includes('policy')) {
        userMessage = 'Error de permisos. Contacta al administrador.';
      }
      
      Alert.alert('Error', userMessage);
    }
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permisos Requeridos',
        'Necesitamos acceso a la cámara y galería para seleccionar fotos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setIsLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // Deshabilitamos el editor para evitar crashes
        quality: 0.7, // Reducimos calidad para evitar problemas de memoria
        exif: false, // No incluir datos EXIF
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[SimpleImageUpload] Imagen seleccionada:', result.assets[0].uri);
        await uploadImageToSupabase(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[SimpleImageUpload] Error selecting image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setIsLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false, // Deshabilitamos el editor para evitar crashes
        quality: 0.7, // Reducimos calidad para evitar problemas de memoria
        exif: false, // No incluir datos EXIF
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[SimpleImageUpload] Foto tomada:', result.assets[0].uri);
        await uploadImageToSupabase(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[SimpleImageUpload] Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePress = () => {
    if (isLoading) return;
    
    Alert.alert(
      'Seleccionar Imagen',
      'Elige una opción',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Galería', onPress: pickFromGallery },
        { text: 'Cámara', onPress: takePhoto },
      ]
    );
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={handlePress}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#666" />
        ) : currentImage ? (
          <Image source={{ uri: currentImage }} style={styles.imagePreview} />
        ) : (
          <View style={styles.placeholder}>
            <MaterialIcons name="add-a-photo" size={32} color="#666" />
            <Text style={styles.placeholderText}>{placeholder}</Text>
          </View>
        )}
      </TouchableOpacity>
      
      {currentImage && (
        <TouchableOpacity 
          style={styles.changeButton}
          onPress={handlePress}
          disabled={isLoading}
        >
          <Text style={styles.changeButtonText}>Cambiar foto</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  uploadButton: {
    width: 200,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  changeButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});
