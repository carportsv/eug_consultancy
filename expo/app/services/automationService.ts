import { supabase } from './supabaseClient';

export interface AutomationStatus {
  isRunning: boolean;
  schedules: string[];
  activeTasks: number;
  lastCleanup?: string;
  nextCleanup?: string;
}

export interface DatabaseStats {
  users: number;
  drivers: number;
  rideRequests: number;
  rideHistory: number;
  notifications: number;
  estimatedSpace: number;
  usagePercentage: number;
}

export interface CleanupResult {
  success: boolean;
  ridesDeleted: number;
  usersDeleted: number;
  notificationsDeleted: number;
  locationsCleared: number;
  spaceFreed: number;
  error?: string;
}

export class AutomationService {
  
  // Obtener estado de automatización
  static async getAutomationStatus(): Promise<AutomationStatus> {
    try {
      // En producción, esto vendría de una tabla en Supabase o un servicio externo
      // Por ahora, simulamos el estado
      const now = new Date();
      const nextCleanup = new Date(now);
      nextCleanup.setDate(nextCleanup.getDate() + (7 - nextCleanup.getDay())); // Próximo domingo
      nextCleanup.setHours(2, 0, 0, 0);

      return {
        isRunning: true,
        schedules: ['weekly-cleanup', 'daily-monitoring', 'hourly-alerts', 'weekly-backup'],
        activeTasks: 4,
        lastCleanup: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Hace 1 semana
        nextCleanup: nextCleanup.toISOString(),
      };
    } catch (error) {
      console.error('Error obteniendo estado de automatización:', error);
      throw error;
    }
  }

  // Obtener estadísticas de la base de datos
  static async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const [usersResult, driversResult, ridesResult, historyResult, notificationsResult] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('drivers').select('*', { count: 'exact', head: true }),
        supabase.from('ride_requests').select('*', { count: 'exact', head: true }),
        supabase.from('ride_history').select('*', { count: 'exact', head: true }),
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
      ]);

      const stats: DatabaseStats = {
        users: usersResult.count || 0,
        drivers: driversResult.count || 0,
        rideRequests: ridesResult.count || 0,
        rideHistory: historyResult.count || 0,
        notifications: notificationsResult.count || 0,
        estimatedSpace: 0,
        usagePercentage: 0,
      };

      // Calcular espacio estimado
      stats.estimatedSpace = (
        (stats.users * 0.001) + // ~1KB por usuario
        (stats.rideRequests * 0.002) + // ~2KB por viaje
        (stats.drivers * 0.001) // ~1KB por conductor
      );

      stats.usagePercentage = ((stats.estimatedSpace / 500) * 100);

      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // Ejecutar limpieza manual
  static async executeManualCleanup(): Promise<CleanupResult> {
    try {
      console.log('🧹 Ejecutando limpieza manual...');

      const results = {
        ridesDeleted: 0,
        usersDeleted: 0,
        notificationsDeleted: 0,
        locationsCleared: 0,
      };

      // 1. Limpiar viajes antiguos (> 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: oldRides, error: ridesError } = await supabase
        .from('ride_requests')
        .delete()
        .lt('created_at', sixMonthsAgo.toISOString())
        .in('status', ['completed', 'cancelled'])
        .select('id');

      if (ridesError) {
        console.error('Error limpiando viajes:', ridesError);
      } else {
        results.ridesDeleted = oldRides?.length || 0;
      }

      // 2. Limpiar usuarios inactivos (> 1 año)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data: inactiveUsers, error: usersError } = await supabase
        .from('users')
        .delete()
        .lt('last_login', oneYearAgo.toISOString())
        .eq('role', 'user')
        .select('id');

      if (usersError) {
        console.error('Error limpiando usuarios:', usersError);
      } else {
        results.usersDeleted = inactiveUsers?.length || 0;
      }

      // 3. Limpiar notificaciones antiguas (> 1 mes)
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data: oldNotifications, error: notificationsError } = await supabase
        .from('notifications')
        .delete()
        .lt('created_at', oneMonthAgo.toISOString())
        .select('id');

      if (notificationsError) {
        console.error('Error limpiando notificaciones:', notificationsError);
      } else {
        results.notificationsDeleted = oldNotifications?.length || 0;
      }

      // 4. Limpiar ubicaciones antiguas de conductores (> 1 día)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data: clearedLocations, error: locationsError } = await supabase
        .from('drivers')
        .update({ location: null })
        .lt('updated_at', oneDayAgo.toISOString())
        .eq('is_available', false)
        .select('id');

      if (locationsError) {
        console.error('Error limpiando ubicaciones:', locationsError);
      } else {
        results.locationsCleared = clearedLocations?.length || 0;
      }

      // Calcular espacio liberado
      const spaceFreed = (
        results.ridesDeleted * 0.002 + // ~2KB por viaje
        results.usersDeleted * 0.001 + // ~1KB por usuario
        results.notificationsDeleted * 0.0005 // ~0.5KB por notificación
      );

      console.log('✅ Limpieza manual completada:', results);

      return {
        success: true,
        ...results,
        spaceFreed,
      };
    } catch (error) {
      console.error('Error en limpieza manual:', error);
      return {
        success: false,
        ridesDeleted: 0,
        usersDeleted: 0,
        notificationsDeleted: 0,
        locationsCleared: 0,
        spaceFreed: 0,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  // Iniciar automatización
  static async startAutomation(): Promise<boolean> {
    try {
      console.log('🤖 Iniciando automatización...');
      
      // En producción, esto iniciaría el proceso de automatización
      // Por ahora, simulamos el inicio
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Automatización iniciada');
      return true;
    } catch (error) {
      console.error('Error iniciando automatización:', error);
      return false;
    }
  }

  // Detener automatización
  static async stopAutomation(): Promise<boolean> {
    try {
      console.log('🛑 Deteniendo automatización...');
      
      // En producción, esto detendría el proceso de automatización
      // Por ahora, simulamos la detención
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✅ Automatización detenida');
      return true;
    } catch (error) {
      console.error('Error deteniendo automatización:', error);
      return false;
    }
  }

  // Obtener logs de automatización
  static async getAutomationLogs(limit: number = 50): Promise<any[]> {
    try {
      // En producción, esto vendría de una tabla de logs
      // Por ahora, simulamos logs
      const logs = [
        {
          id: 1,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Limpieza semanal completada exitosamente',
          details: { ridesDeleted: 5, usersDeleted: 2, spaceFreed: 0.012 }
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          level: 'info',
          message: 'Monitoreo diario ejecutado',
          details: { usagePercentage: 0.5, activeUsers: 8 }
        },
        {
          id: 3,
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          level: 'warning',
          message: 'Uso de espacio moderado detectado',
          details: { usagePercentage: 65 }
        }
      ];

      return logs.slice(0, limit);
    } catch (error) {
      console.error('Error obteniendo logs:', error);
      return [];
    }
  }

  // Actualizar configuración de automatización
  static async updateAutomationConfig(config: {
    autoCleanup: boolean;
    autoOptimization: boolean;
    autoMonitoring: boolean;
  }): Promise<boolean> {
    try {
      console.log('⚙️ Actualizando configuración de automatización:', config);
      
      // En producción, esto guardaría la configuración en Supabase
      // Por ahora, simulamos la actualización
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Configuración actualizada');
      return true;
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      return false;
    }
  }
} 