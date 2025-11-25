// services/userService.ts

import { supabase } from './supabaseClient';

// Obtiene los datos del usuario por su firebase_uid
export const getUserData = async (firebaseUid: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .single();
    if (error) {
      console.error('Error al obtener los datos del usuario desde Supabase:', error);
      return null;
    }
    if (!data) {
      console.warn('No se encontraron datos para el usuario:', firebaseUid);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error inesperado al obtener los datos del usuario:', error);
    return null;
  }
};

// Guarda o actualiza los datos del usuario
export const saveUserData = async (userId: string, userData: any) => {
  try {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        ...userData,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      console.error('Error al guardar los datos del usuario en Supabase:', error);
      throw error;
    }
    console.log('Datos del usuario guardados exitosamente en Supabase');
  } catch (error) {
    console.error('Error inesperado al guardar los datos del usuario:', error);
    throw error;
  }
};

// Obtiene el rol del usuario por su UID
export const getUserRoleFromSupabase = async (uid: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('firebase_uid', uid)
      .maybeSingle(); // Cambiado de .single() a .maybeSingle() para manejar usuarios que no existen
    if (error) {
      console.error('Error al obtener el rol del usuario desde Supabase:', error);
      return null;
    }
    return data?.role || null;
  } catch (error) {
    console.error('Error inesperado al obtener el rol del usuario:', error);
    return null;
  }
};

// Obtiene usuario por email (OPTIMIZADO)
export const getUserByEmail = async (email: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1)
      .maybeSingle(); // Cambiado de .single() a .maybeSingle() para manejar usuarios que no existen
    if (error) {
      console.error('Error al buscar usuario por email en Supabase:', error);
      return null;
    }
    if (!data) {
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error inesperado al buscar usuario por email:', error);
    return null;
  }
};

// Actualiza los datos del usuario por firebase_uid
export const updateUserData = async (firebaseUid: string, updates: any) => {
  try {
    // Solo campos válidos que existen en la tabla users de Supabase
    const validFields = [
      'display_name', 'email', 'phone_number', 'role', 'photo_url'
    ];
    
    const filteredUpdates: any = {};
    validFields.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });
    
    // Si no hay campos válidos para actualizar, salir
    if (Object.keys(filteredUpdates).length === 0) {
      console.log('No hay campos válidos para actualizar en la tabla users');
      return;
    }
    
    const { error } = await supabase
      .from('users')
      .update({
        ...filteredUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('firebase_uid', firebaseUid);
    if (error) {
      console.error('Error al actualizar los datos del usuario en Supabase:', error);
      throw error;
    }
    console.log('Datos del usuario actualizados exitosamente en Supabase:', filteredUpdates);
  } catch (error) {
    console.error('Error inesperado al actualizar los datos del usuario:', error);
    throw error;
  }
};

// Obtiene todos los usuarios con un rol específico (OPTIMIZADO)
export const getUsersByRole = async (role: string, maxUsers: number = 50) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .order('updated_at', { ascending: false })
      .limit(maxUsers);
    if (error) {
      console.error('Error al obtener usuarios por rol en Supabase:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error inesperado al obtener usuarios por rol:', error);
    return [];
  }
};

// Verifica si un número de teléfono ya está registrado (OPTIMIZADO)
export const checkPhoneNumberExists = async (phoneNumber: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('phoneNumber', phoneNumber)
      .limit(1);
    if (error) {
      console.error('Error al verificar número de teléfono en Supabase:', error);
      return false;
    }
    return (data && data.length > 0) || false;
  } catch (error) {
    console.error('Error inesperado al verificar número de teléfono:', error);
    return false;
  }
};

// Obtiene conductores disponibles (OPTIMIZADO)
export const getAvailableDrivers = async (maxDrivers: number = 20) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('isAvailable', true)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(maxDrivers);
    if (error) {
      console.error('Error al obtener conductores disponibles en Supabase:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error inesperado al obtener conductores disponibles:', error);
    return [];
  }
};

// Obtiene viajes de un usuario con paginación (OPTIMIZADO)
export const getUserRides = async (
  userId: string, 
  status: string[] = ['completed', 'cancelled'],
  maxRides: number = 20
) => {
  try {
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', status)
      .order('created_at', { ascending: false })
      .limit(maxRides);
    if (error) {
      console.error('Error al obtener viajes del usuario en Supabase:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error inesperado al obtener viajes del usuario:', error);
    return [];
  }
};

// Obtiene viajes de un conductor con paginación (OPTIMIZADO)
export const getDriverRides = async (
  driverId: string, 
  status: string[] = ['completed', 'cancelled'],
  maxRides: number = 20
) => {
  try {
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('driver_id', driverId)
      .in('status', status)
      .order('created_at', { ascending: false })
      .limit(maxRides);
    if (error) {
      console.error('Error al obtener viajes del conductor en Supabase:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error inesperado al obtener viajes del conductor:', error);
    return [];
  }
};

// Sincroniza manualmente los datos del conductor
export const syncDriverDataManually = async (driverId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', driverId)
      .single();
    if (error) {
      console.error('Error al sincronizar datos del conductor en Supabase:', error);
      return false;
    }
    if (data) {
      // Aquí puedes agregar lógica adicional de sincronización si es necesaria
      console.log('Datos del conductor sincronizados manualmente:', driverId);
      return true;
    } else {
      console.warn('No se encontraron datos del conductor:', driverId);
      return false;
    }
  } catch (error) {
    console.error('Error inesperado al sincronizar datos del conductor:', error);
    return false;
  }
};
