/**
 * Script de diagnóstico para verificar el estado de la tabla notifications
 * Ejecutar en la consola del navegador en la página de admin
 */

class NotificationsDebugger {
    constructor() {
        this.supabaseUrl = CONFIG.SUPABASE_URL;
        this.supabaseKey = CONFIG.SUPABASE_ANON_KEY;
    }

    async checkNotificationsTable() {
        console.log('🔍 === DIAGNÓSTICO DE TABLA NOTIFICATIONS ===');
        
        try {
            // 1. Verificar si la tabla existe y su estructura
            console.log('📋 Verificando estructura de la tabla...');
            const structureResponse = await fetch(`${this.supabaseUrl}/rest/v1/notifications?select=*&limit=0`, {
                method: 'GET',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (structureResponse.ok) {
                console.log('✅ Tabla notifications existe y es accesible');
                
                // Verificar si tiene datos
                const dataResponse = await fetch(`${this.supabaseUrl}/rest/v1/notifications?select=id,title,body,created_at&limit=5`, {
                    method: 'GET',
                    headers: {
                        'apikey': this.supabaseKey,
                        'Authorization': `Bearer ${this.supabaseKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (dataResponse.ok) {
                    const data = await dataResponse.json();
                    console.log(`📊 Tabla tiene ${data.length} registros (mostrando primeros 5):`, data);
                } else {
                    console.log('⚠️ No se pudieron obtener datos de la tabla');
                }
            } else {
                console.log('❌ Error al acceder a la tabla notifications:', structureResponse.status);
                const errorText = await structureResponse.text();
                console.log('Error details:', errorText);
            }

        } catch (error) {
            console.error('❌ Error en diagnóstico:', error);
        }
    }

    async testNotificationInsert() {
        console.log('🧪 === PRUEBA DE INSERCIÓN DE NOTIFICACIÓN ===');
        
        try {
            // Obtener un driver y ride de prueba
            const driversResponse = await fetch(`${this.supabaseUrl}/rest/v1/drivers?select=id&limit=1`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`
                }
            });

            const ridesResponse = await fetch(`${this.supabaseUrl}/rest/v1/ride_requests?select=id&limit=1`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`
                }
            });

            if (!driversResponse.ok || !ridesResponse.ok) {
                console.log('❌ No se pudieron obtener datos de prueba');
                return;
            }

            const drivers = await driversResponse.json();
            const rides = await ridesResponse.json();

            if (drivers.length === 0 || rides.length === 0) {
                console.log('❌ No hay drivers o rides disponibles para la prueba');
                return;
            }

            const testNotification = {
                driver_id: drivers[0].id,
                ride_id: rides[0].id,
                title: '🧪 Prueba de Notificación',
                body: 'Esta es una notificación de prueba generada desde el navegador.',
                data: { test: true, timestamp: new Date().toISOString() }
            };

            console.log('📝 Insertando notificación de prueba:', testNotification);

            const insertResponse = await fetch(`${this.supabaseUrl}/rest/v1/notifications`, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(testNotification)
            });

            if (insertResponse.ok) {
                const result = await insertResponse.json();
                console.log('✅ Notificación insertada exitosamente:', result);
                
                // Limpiar la notificación de prueba
                setTimeout(async () => {
                    await this.cleanupTestNotification(result[0].id);
                }, 2000);
            } else {
                const errorText = await insertResponse.text();
                console.log('❌ Error al insertar notificación:', insertResponse.status, errorText);
            }

        } catch (error) {
            console.error('❌ Error en prueba de inserción:', error);
        }
    }

    async cleanupTestNotification(notificationId) {
        try {
            const deleteResponse = await fetch(`${this.supabaseUrl}/rest/v1/notifications?id=eq.${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`
                }
            });

            if (deleteResponse.ok) {
                console.log('🧹 Notificación de prueba eliminada');
            } else {
                console.log('⚠️ No se pudo eliminar la notificación de prueba');
            }
        } catch (error) {
            console.log('⚠️ Error al limpiar notificación de prueba:', error);
        }
    }

    async runFullDiagnostic() {
        console.log('🚀 === DIAGNÓSTICO COMPLETO DE NOTIFICACIONES ===');
        await this.checkNotificationsTable();
        await this.testNotificationInsert();
        console.log('✅ Diagnóstico completado');
    }
}

// Crear instancia global para uso en consola
window.notificationsDebugger = new NotificationsDebugger();

// Función de conveniencia para ejecutar diagnóstico completo
window.debugNotifications = () => {
    window.notificationsDebugger.runFullDiagnostic();
};

console.log('🔧 NotificationsDebugger cargado. Usa debugNotifications() para ejecutar diagnóstico completo.');
