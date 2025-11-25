import { supabase } from './supabaseClient';

export interface RideRequest {
  id: string;
  user_id: string;
  driver_id: string | null;
  origin: {
    address: string;
    coordinates: { latitude: number; longitude: number };
  };
  destination: {
    address: string;
    coordinates: { latitude: number; longitude: number };
  };
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  price: number;
  distance: number;
  duration: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    display_name: string;
    phone_number: string;
  };
}

export interface Driver {
  id: string;
  user_id: string;
  is_available: boolean;
  status: 'active' | 'inactive' | 'busy';
  location: { latitude: number; longitude: number } | null;
  rating: number;
  total_rides: number;
  earnings: number;
  car_info: {
    model: string;
    plate: string;
    year: number;
  } | null;
  created_at: string;
  user?: {
    id: string;
    email: string;
    display_name: string;
    phone_number: string;
  };
}

export class AdminService {
  // Obtener todos los viajes pendientes de asignación
  static async getPendingRides(): Promise<RideRequest[]> {
    try {
      const { data, error } = await supabase
        .from('ride_requests')
        .select(`
          *,
          user:users(id, email, display_name, phone_number)
        `)
        .eq('status', 'requested')
        .is('driver_id', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error obteniendo viajes pendientes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en getPendingRides:', error);
      throw error;
    }
  }

  // Obtener todos los conductores disponibles
  static async getAvailableDrivers(): Promise<Driver[]> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          user:users(id, email, display_name, phone_number)
        `)
        .eq('is_available', true)
        .eq('status', 'active')
        .order('rating', { ascending: false });

      if (error) {
        console.error('Error obteniendo conductores disponibles:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en getAvailableDrivers:', error);
      throw error;
    }
  }

  // Obtener todos los conductores (incluyendo no disponibles)
  static async getAllDrivers(): Promise<Driver[]> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          user:users(id, email, display_name, phone_number)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error obteniendo todos los conductores:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en getAllDrivers:', error);
      throw error;
    }
  }

  // Obtener todos los viajes (con filtros opcionales)
  static async getAllRides(filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<RideRequest[]> {
    try {
      let query = supabase
        .from('ride_requests')
        .select(`
          *,
          user:users(id, email, display_name, phone_number),
          driver:drivers(id, user:users(id, email, display_name, phone_number))
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error obteniendo viajes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en getAllRides:', error);
      throw error;
    }
  }

  // Asignar conductor a un viaje
  static async assignDriverToRide(rideId: string, driverId: string): Promise<boolean> {
    try {
      // Verificar que el viaje esté disponible para asignación
      const { data: ride, error: rideError } = await supabase
        .from('ride_requests')
        .select('status, driver_id')
        .eq('id', rideId)
        .single();

      if (rideError) {
        console.error('Error verificando viaje:', rideError);
        throw new Error('Viaje no encontrado');
      }

      if (ride.status !== 'requested') {
        throw new Error('El viaje ya no está disponible para asignación');
      }

      if (ride.driver_id) {
        throw new Error('El viaje ya tiene un conductor asignado');
      }

      // Verificar que el conductor esté disponible
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('is_available, status')
        .eq('id', driverId)
        .single();

      if (driverError) {
        console.error('Error verificando conductor:', driverError);
        throw new Error('Conductor no encontrado');
      }

      if (!driver.is_available || driver.status !== 'active') {
        throw new Error('El conductor no está disponible');
      }

      // Asignar el conductor al viaje
      const { error: updateError } = await supabase
        .from('ride_requests')
        .update({
          driver_id: driverId,
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', rideId);

      if (updateError) {
        console.error('Error asignando conductor:', updateError);
        throw updateError;
      }

      // Actualizar estado del conductor
      const { error: driverUpdateError } = await supabase
        .from('drivers')
        .update({
          is_available: false,
          status: 'busy',
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (driverUpdateError) {
        console.error('Error actualizando estado del conductor:', driverUpdateError);
        // No lanzamos error aquí porque la asignación ya se hizo
      }

      console.log(`✅ Conductor ${driverId} asignado al viaje ${rideId}`);
      return true;
    } catch (error) {
      console.error('Error en assignDriverToRide:', error);
      throw error;
    }
  }

  // Desasignar conductor de un viaje
  static async unassignDriverFromRide(rideId: string): Promise<boolean> {
    try {
      // Obtener información del viaje
      const { data: ride, error: rideError } = await supabase
        .from('ride_requests')
        .select('driver_id, status')
        .eq('id', rideId)
        .single();

      if (rideError) {
        console.error('Error obteniendo viaje:', rideError);
        throw new Error('Viaje no encontrado');
      }

      if (!ride.driver_id) {
        throw new Error('El viaje no tiene conductor asignado');
      }

      if (ride.status !== 'accepted') {
        throw new Error('Solo se pueden desasignar viajes en estado "accepted"');
      }

      // Desasignar el conductor
      const { error: updateError } = await supabase
        .from('ride_requests')
        .update({
          driver_id: null,
          status: 'requested',
          updated_at: new Date().toISOString()
        })
        .eq('id', rideId);

      if (updateError) {
        console.error('Error desasignando conductor:', updateError);
        throw updateError;
      }

      // Reactivar el conductor
      const { error: driverUpdateError } = await supabase
        .from('drivers')
        .update({
          is_available: true,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', ride.driver_id);

      if (driverUpdateError) {
        console.error('Error reactivando conductor:', driverUpdateError);
        // No lanzamos error aquí porque la desasignación ya se hizo
      }

      console.log(`✅ Conductor desasignado del viaje ${rideId}`);
      return true;
    } catch (error) {
      console.error('Error en unassignDriverFromRide:', error);
      throw error;
    }
  }

  // Obtener estadísticas para el dashboard
  static async getDashboardStats() {
    try {
      // Viajes por estado
      const { data: ridesByStatus, error: ridesError } = await supabase
        .from('ride_requests')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Últimas 24 horas

      if (ridesError) {
        console.error('Error obteniendo estadísticas de viajes:', ridesError);
        throw ridesError;
      }

      const stats = {
        totalRides: ridesByStatus?.length || 0,
        pendingRides: ridesByStatus?.filter(r => r.status === 'requested').length || 0,
        activeRides: ridesByStatus?.filter(r => r.status === 'accepted' || r.status === 'in_progress').length || 0,
        completedRides: ridesByStatus?.filter(r => r.status === 'completed').length || 0,
        cancelledRides: ridesByStatus?.filter(r => r.status === 'cancelled').length || 0,
        availableDrivers: 0, // Se actualizará después
      };

      // Conductores disponibles
      const { data: availableDrivers, error: driversError } = await supabase
        .from('drivers')
        .select('id')
        .eq('is_available', true)
        .eq('status', 'active');

      if (driversError) {
        console.error('Error obteniendo conductores disponibles:', driversError);
        throw driversError;
      }

      stats.availableDrivers = availableDrivers?.length || 0;

      return stats;
    } catch (error) {
      console.error('Error en getDashboardStats:', error);
      throw error;
    }
  }
}
