import { supabase } from './supabaseClient';
import { trackRead, trackWrite } from './usageMonitor';
import { NotificationService } from './notificationService';

// Tipos de estado del viaje
export type RideStatus = 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface LocationData {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface RideRequest {
  id?: string;
  userId: string;
  driverId?: string;
  origin: LocationData;
  destination: LocationData;
  status: RideStatus;
  price?: number;
  distance?: number;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
  cancellationReason?: string;
  // Propiedades adicionales para pagos
  payment_method?: string;
  actual_fare?: number;
  estimated_fare?: number;
  user_id?: string;
  driver_id?: string;
}

export interface DriverData {
  id: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  status: string;
  name: string;
  phoneNumber: string;
  car?: {
    model: string;
    plate: string;
  };
  rating?: number;
  totalRides?: number;
  earnings?: number;
}

// Crear una nueva solicitud de viaje
export const createRideRequest = async (rideData: Omit<RideRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = new Date();
    const rideRequestData = {
      user_id: rideData.userId,
      driver_id: rideData.driverId,
      origin: rideData.origin,
      destination: rideData.destination,
      status: rideData.status,
      price: rideData.price,
      distance: rideData.distance ? Math.round(rideData.distance) : null,
      duration: rideData.duration ? Math.round(rideData.duration) : null,
      // Información de pago
      payment_method: (rideData as any).paymentMethod || 'cash',
      tip_amount: (rideData as any).tipAmount || 0,
      discount_amount: (rideData as any).discountAmount || 0,
      total_amount: (rideData as any).total || rideData.price,
      payment_status: 'pending',
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('ride_requests')
      .insert(rideRequestData)
      .select()
      .single();

    if (error) {
      console.error('Error al crear la solicitud de viaje:', error);
      throw error;
    }

    console.log('Solicitud de viaje creada con ID:', data.id);
    
    // CREAR NOTIFICACIONES EN LA BASE DE DATOS PARA TODOS LOS DRIVERS DISPONIBLES
    try {
      console.log('🚨 Creando notificaciones en BD para drivers disponibles...');
      
      // Usar la función de la base de datos para crear notificaciones
      const { data: notificationResult, error: notificationError } = await supabase
        .rpc('create_notification_for_available_drivers', {
          p_title: '🚗 Nueva Solicitud de Viaje',
          p_body: `De ${rideData.origin.address} a ${rideData.destination.address}`,
          p_data: {
            type: 'new_ride_request',
            rideId: data.id,
            message: `Nueva solicitud de viaje disponible: ${rideData.origin.address} → ${rideData.destination.address}`,
          },
          p_type: 'new_ride_request'
        });

      if (notificationError) {
        console.error('❌ Error creando notificaciones:', notificationError);
      } else {
        console.log(`✅ Notificaciones creadas para drivers disponibles`);
      }
    } catch (notificationError) {
      console.error('❌ Error enviando notificaciones push:', notificationError);
      // No fallar la creación de la solicitud por errores de notificación
    }
    
    // Rastrear escritura
    await trackWrite();
    
    return data.id;
  } catch (error) {
    console.error('Error al crear la solicitud de viaje:', error);
    throw error;
  }
};

// Actualizar el estado de un viaje
export const updateRideStatus = async (rideId: string, status: RideStatus, driverId?: string, price?: number) => {
  try {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (driverId) {
      updateData.driver_id = driverId;
    }

    if (price) {
      updateData.price = price;
    }

    const { error } = await supabase
      .from('ride_requests')
      .update(updateData)
      .eq('id', rideId);

    if (error) {
      console.error('Error al actualizar el estado del viaje:', error);
      throw error;
    }

    console.log('Estado del viaje actualizado:', status);
    
    // Rastrear escritura
    await trackWrite();
  } catch (error) {
    console.error('Error al actualizar el estado del viaje:', error);
    throw error;
  }
};

// Clase personalizada para errores de negocio
class RideBusinessError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'RideBusinessError';
    this.code = code;
  }
}

// Aceptar un viaje por un conductor
export const acceptRide = async (rideId: string, driverId: string, price: number) => {
  try {
    console.log('[RideService] Intentando aceptar viaje:', rideId, 'por driver:', driverId);
    
    // PRIMERO: Verificar que el viaje aún esté disponible para aceptar
    const { data: rideData, error: rideError } = await supabase
      .from('ride_requests')
      .select('status, driver_id')
      .eq('id', rideId)
      .single();

    if (rideError) {
      console.error('[RideService] Error verificando estado del viaje:', rideError);
      throw new Error('No se pudo verificar el estado del viaje');
    }

    if (!rideData) {
      console.error('[RideService] Viaje no encontrado:', rideId);
      throw new Error('Viaje no encontrado');
    }

    // Verificar que el viaje esté en estado 'requested' y no tenga driver asignado
    if (rideData.status !== 'requested') {
      console.error('[RideService] Viaje no disponible para aceptar. Estado actual:', rideData.status);
      throw new RideBusinessError(`El viaje ya no está disponible (estado: ${rideData.status})`, 'RIDE_NOT_AVAILABLE');
    }

    if (rideData.driver_id) {
      console.error('[RideService] Viaje ya tiene conductor asignado:', rideData.driver_id);
      throw new RideBusinessError('El viaje ya fue aceptado por otro conductor', 'RIDE_ALREADY_ACCEPTED');
    }

    console.log('[RideService] Viaje verificado, procediendo con aceptación...');

    // Asegurar que guardamos drivers.id; si recibimos users.id, intentamos mapear
    let finalDriverId: string = driverId;
    try {
      const { data: drv } = await supabase
        .from('drivers')
        .select('id')
        .or(`id.eq.${driverId},user_id.eq.${driverId}`)
        .limit(1);
      if (drv && drv.length > 0 && drv[0]?.id) finalDriverId = drv[0].id;
    } catch {}

    // SEGUNDO: Actualizar el viaje con verificación de estado
    const { error: updateError } = await supabase
      .from('ride_requests')
      .update({ 
        status: 'accepted',
        driver_id: finalDriverId,
        price: price,
        updated_at: new Date().toISOString()
      })
      .eq('id', rideId)
      .eq('status', 'requested') // Solo actualizar si aún está en 'requested'
      .is('driver_id', null); // Y no tiene driver asignado

    if (updateError) {
      console.error('[RideService] Error actualizando viaje:', updateError);
      throw new Error('Error al actualizar el viaje');
    }

    // Verificar si la actualización fue exitosa
    const { data: updatedRide, error: checkError } = await supabase
      .from('ride_requests')
      .select('status, driver_id')
      .eq('id', rideId)
      .single();

    if (checkError || !updatedRide) {
      console.error('[RideService] Error verificando actualización:', checkError);
      throw new Error('Error al verificar la actualización del viaje');
    }

    if (updatedRide.status !== 'accepted' || updatedRide.driver_id !== finalDriverId) {
      console.error('[RideService] Viaje no se actualizó correctamente. Estado:', updatedRide.status, 'Driver:', updatedRide.driver_id);
      throw new Error('El viaje ya no está disponible o fue aceptado por otro conductor');
    }
    
    // TERCERO: Actualizar el estado del conductor a no disponible
    const { error: driverError } = await supabase
      .from('drivers')
      .update({ is_available: false, updated_at: new Date() })
      .eq('id', finalDriverId);

    if (driverError) {
      console.error('[RideService] Error al actualizar el estado del conductor:', driverError);
      // No fallar aquí, el viaje ya fue aceptado
    }
    
    console.log('[RideService] ✅ Viaje aceptado exitosamente por el conductor:', finalDriverId);
    
    // Rastrear escritura
    await trackWrite();
    
    return true;
  } catch (error) {
    console.error('[RideService] ❌ Error al aceptar el viaje:', error);
    throw error;
  }
};

// Obtener conductores disponibles en tiempo real (OPTIMIZADO)
export const watchAvailableDrivers = async (callback: (drivers: DriverData[]) => void, maxDrivers: number = 10) => {
  console.log('Iniciando watchAvailableDrivers...');
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('isAvailable', true)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(maxDrivers);

  if (error) {
    console.error('Error al obtener conductores disponibles:', error);
    return;
  }

  console.log('Conductores disponibles encontrados:', data?.length || 0);
  
  // Rastrear lectura
  await trackRead(data?.length || 0);
  
  const drivers = (data || []).map((row: any) => ({
    id: row.id,
    isAvailable: row.isAvailable,
    createdAt: row.createdAt,
    updatedAt: row.updated_at,
    location: row.location,
    status: row.status,
    name: row.name,
    phoneNumber: row.phoneNumber,
    car: row.car,
    rating: row.rating,
    totalRides: row.totalRides,
    earnings: row.earnings,
  } as DriverData));

  if (drivers.length === 0) {
    console.log('No se encontraron conductores disponibles');
  } else {
    console.log('Conductores disponibles encontrados:', drivers.length);
  }
  
  callback(drivers);
};

// Cancelar una solicitud de viaje
export const cancelRideRequest = async (rideId: string) => {
  try {
    console.log('[RideService] Cancelando solicitud de viaje:', rideId);
    
    // PRIMERO: Verificar el estado actual del viaje
    const { data: rideData, error: rideError } = await supabase
      .from('ride_requests')
      .select('status, driver_id')
      .eq('id', rideId)
      .single();

    if (rideError) {
      console.error('[RideService] Error verificando estado del viaje:', rideError);
      throw new Error('No se pudo verificar el estado del viaje');
    }

    if (!rideData) {
      console.error('[RideService] Viaje no encontrado:', rideId);
      throw new Error('Viaje no encontrado');
    }

    // Solo permitir cancelar si está en estado 'requested' o 'accepted'
    if (rideData.status === 'cancelled') {
      console.log('[RideService] Viaje ya está cancelado');
      return true; // Ya está cancelado, no hacer nada
    }

    if (rideData.status === 'completed') {
      console.error('[RideService] No se puede cancelar un viaje completado');
      throw new Error('No se puede cancelar un viaje completado');
    }

    console.log('[RideService] Cancelando viaje en estado:', rideData.status);
    
    // SEGUNDO: Actualizar estado a 'cancelled' con verificación
    const { error: updateError } = await supabase
      .from('ride_requests')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', rideId)
      .not('status', 'eq', 'completed'); // No cancelar si ya está completado

    if (updateError) {
      console.error('[RideService] Error cancelando viaje:', updateError);
      throw new Error('Error al cancelar el viaje');
    }

    // TERCERO: Si el viaje tenía conductor asignado, liberarlo
    if (rideData.driver_id) {
      console.log('[RideService] Liberando conductor:', rideData.driver_id);
      const { error: driverError } = await supabase
        .from('drivers')
        .update({ 
          is_available: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', rideData.driver_id);

      if (driverError) {
        console.warn('[RideService] Error liberando conductor:', driverError);
        // No fallar aquí, el viaje ya fue cancelado
      }
    }

    console.log('[RideService] ✅ Solicitud cancelada exitosamente');
    
    // Rastrear escritura
    await trackWrite();
    
    return true;
  } catch (error) {
    console.error('[RideService] ❌ Error inesperado cancelando viaje:', error);
    throw error;
  }
};

// Obtener conductores disponibles con paginación
export const getAvailableDriversPaginated = async (
  lastDriver?: DriverData, 
  pageSize: number = 10
): Promise<DriverData[]> => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('isAvailable', true)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .range(0, pageSize - 1);

    if (error) {
      console.error('Error al obtener conductores con paginación:', error);
      return [];
    }
    
    // Rastrear lectura
    await trackRead(data.length);
    
    return data.map((row: any) => ({
      id: row.id,
      ...(row || {})
    } as DriverData));
  } catch (error) {
    console.error('Error al obtener conductores con paginación:', error);
    return [];
  }
};

// Escuchar solicitudes de viaje para un conductor (OPTIMIZADO)
export const watchRideRequests = async (
  driverId: string, 
  callback: (rides: Array<RideRequest & { id: string }>) => void,
  maxRequests: number = 20
) => {
  console.log('Iniciando watchRideRequests optimizado');
  const { data, error } = await supabase
    .from('ride_requests')
    .select('*')
    .eq('status', 'requested')
    .order('created_at', { ascending: false })
    .limit(maxRequests);

  if (error) {
    console.error('Error en watchRideRequests:', error);
    return;
  }

  console.log('Snapshot recibido, documentos:', data?.length || 0);
  
  // Rastrear lectura
  trackRead(data.length);
  
  const rides = data.map((row: any) => ({
    id: row.id,
    origin: row.origin,
    destination: row.destination,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updated_at,
    price: row.price,
    distance: row.distance,
    duration: row.duration,
    cancellationReason: row.cancellationReason,
  } as RideRequest & { id: string }));
  callback(rides);
};

// Obtener historial de viajes con paginación
export const getRideHistory = async (
  userId: string,
  userType: 'user' | 'driver',
  lastRide?: RideRequest,
  pageSize: number = 15
): Promise<Array<RideRequest & { id: string }>> => {
  try {
    const field = userType === 'user' ? 'user_id' : 'driver_id';
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .eq(field, userId)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false })
      .range(0, pageSize - 1);

    if (error) {
      console.error('Error al obtener historial de viajes:', error);
      return [];
    }
    
    // Rastrear lectura
    await trackRead(data.length);
    
    return data.map((row: any) => ({
      id: row.id,
      ...(row || {})
    } as RideRequest & { id: string }));
  } catch (error) {
    console.error('Error al obtener historial de viajes:', error);
    return [];
  }
};

// Obtener viaje activo optimizado
export const getActiveRide = async (userId: string, userType: 'user' | 'driver') => {
  try {
    const field = userType === 'user' ? 'user_id' : 'driver_id';
    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .eq(field, userId)
      .in('status', ['accepted', 'in_progress'])
      .limit(1);

    if (error) {
      console.error('Error al obtener viaje activo:', error);
      return null;
    }
    
    // Rastrear lectura
    await trackRead(data.length);
    
    if (data.length > 0) {
      const ride = data[0];
      return {
        id: ride.id,
        ...(ride || {})
      } as RideRequest & { id: string };
    }
    return null;
  } catch (error) {
    console.error('Error al obtener viaje activo:', error);
    return null;
  }
};