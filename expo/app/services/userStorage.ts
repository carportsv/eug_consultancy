// services/userStorage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

// Guarda la sesión del usuario
export const saveUserSession = async (sessionData: any) => {
  try {
    await AsyncStorage.setItem('userSession', JSON.stringify(sessionData));
  } catch (error) {
    console.error('Error al guardar la sesión del usuario:', error);
  }
};

// Obtiene la sesión del usuario
export const getUserSession = async () => {
  try {
    const session = await AsyncStorage.getItem('userSession');
    return session ? JSON.parse(session) : null;
  } catch (error) {
    console.error('Error al obtener la sesión del usuario:', error);
    return null;
  }
};

// Elimina la sesión del usuario (logout)
export const clearUserSession = async () => {
  try {
    await AsyncStorage.removeItem('userSession');
  } catch (error) {
    console.error('Error al eliminar la sesión del usuario:', error);
  }
};
