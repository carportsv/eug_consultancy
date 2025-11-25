import { supabase } from './supabaseClient';

export interface Driver {
  id: string;
  firebase_uid: string;
  display_name: string;
  email: string;
  is_available: boolean;
  status: string;
  current_location?: { latitude: number; longitude: number };
  created_at: string;
  updated_at: string;
}

export class DriverService {
  /**
   * Obtiene el driver_id de Supabase usando el firebase_uid
   */
  static async getDriverIdByFirebaseUid(firebaseUid: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id')
        .eq('firebase_uid', firebaseUid)
        .maybeSingle();

      if (error) {
        console.error('[DriverService] Error obteniendo driver_id:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('[DriverService] Error en getDriverIdByFirebaseUid:', error);
      return null;
    }
  }

  /**
   * Asegura que exista un registro en drivers para un users.id dado
   */
  static async ensureDriverForUserId(userId: string): Promise<string | null> {
    try {
      const { data: existing } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (existing?.id) return existing.id as string;

      const { data: inserted, error } = await supabase
        .from('drivers')
        .insert({ user_id: userId, is_available: false, status: 'active' })
        .select('id')
        .single();
      if (error) {
        console.error('[DriverService] Error creando driver para user_id:', error);
        return null;
      }
      return inserted?.id || null;
    } catch (err) {
      console.error('[DriverService] Error en ensureDriverForUserId:', err);
      return null;
    }
  }

  /**
   * Actualiza car_info/documents para un conductor a partir de users.id
   */
  static async updateDriverCarInfoByUserId(
    userId: string,
    carInfo: { model?: string; make?: string; year?: number; plate?: string; color?: string; photo?: string },
    documents?: { license?: string; insurance?: string; registration?: string }
  ): Promise<boolean> {
    try {
      // Asegurar existencia
      const driverId = await this.ensureDriverForUserId(userId);
      if (!driverId) return false;

      console.log('[DriverService] Actualizando car_info para driverId:', driverId);
      console.log('[DriverService] Datos a guardar:', carInfo);

      const { error } = await supabase
        .from('drivers')
        .update({
          car_info: carInfo,
          documents: documents || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', driverId);
      if (error) {
        console.error('[DriverService] Error actualizando car_info:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[DriverService] Error en updateDriverCarInfoByUserId:', err);
      return false;
    }
  }

  /**
   * Obtiene los datos completos del driver
   */
  static async getDriverByFirebaseUid(firebaseUid: string): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('firebase_uid', firebaseUid)
        .maybeSingle();

      if (error) {
        console.error('[DriverService] Error obteniendo driver:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[DriverService] Error en getDriverByFirebaseUid:', error);
      return null;
    }
  }

  /**
   * Registra o actualiza un driver
   */
  static async registerDriver(driverData: {
    firebase_uid: string;
    display_name: string;
    email: string;
    is_available?: boolean;
    status?: string;
    current_location?: { latitude: number; longitude: number };
  }): Promise<Driver | null> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .upsert({
          ...driverData,
          is_available: driverData.is_available ?? true,
          status: driverData.status ?? 'active',
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('[DriverService] Error registrando driver:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[DriverService] Error en registerDriver:', error);
      return null;
    }
  }

  /**
   * Actualiza la disponibilidad del driver
   */
  static async updateDriverAvailability(
    driverId: string, 
    isAvailable: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ 
          is_available: isAvailable,
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (error) {
        console.error('[DriverService] Error actualizando disponibilidad:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[DriverService] Error en updateDriverAvailability:', error);
      return false;
    }
  }

  /**
   * Actualiza la ubicación actual del driver
   */
  static async updateDriverLocation(
    driverId: string, 
    location: { latitude: number; longitude: number }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ 
          current_location: location,
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (error) {
        console.error('[DriverService] Error actualizando ubicación:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[DriverService] Error en updateDriverLocation:', error);
      return false;
    }
  }

  /**
   * Obtiene todos los conductores disponibles
   */
  static async getAvailableDrivers(
    latitude?: number,
    longitude?: number,
    radiusKm?: number
  ): Promise<Driver[]> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_available', true)
        .eq('status', 'active');

      if (error) {
        console.error('[DriverService] Error obteniendo conductores disponibles:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[DriverService] Error en getAvailableDrivers:', error);
      return [];
    }
  }


} 