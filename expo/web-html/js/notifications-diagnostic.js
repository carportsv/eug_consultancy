/**
 * Script de diagnóstico para el problema de notifications
 * Ejecutar en la consola del navegador en la página de admin
 */

async function diagnoseNotificationsIssue() {
    console.log('🔍 === DIAGNÓSTICO COMPLETO DE NOTIFICATIONS ===');
    
    // Obtener configuración desde CONFIG (que carga desde .env)
    if (typeof CONFIG === 'undefined') {
        console.error('❌ CONFIG no está disponible. Asegúrate de que config.js esté cargado.');
        return;
    }
    
    const supabaseUrl = CONFIG.SUPABASE_URL;
    const supabaseKey = CONFIG.SUPABASE_ANON_KEY;
    
    console.log('🌐 Supabase URL:', supabaseUrl);
    console.log('🔑 API Key:', supabaseKey.substring(0, 20) + '...');
    
    try {
        // 1. Verificar si la tabla existe
        console.log('\n📋 1. Verificando existencia de la tabla...');
        const tableCheckResponse = await fetch(`${supabaseUrl}/rest/v1/notifications?select=*&limit=0`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (tableCheckResponse.ok) {
            console.log('✅ Tabla notifications existe y es accesible');
        } else {
            console.log('❌ Error al acceder a la tabla:', tableCheckResponse.status);
            const errorText = await tableCheckResponse.text();
            console.log('Error details:', errorText);
            return;
        }

        // 2. Verificar estructura de la tabla
        console.log('\n🏗️ 2. Verificando estructura de la tabla...');
        const structureResponse = await fetch(`${supabaseUrl}/rest/v1/notifications?select=id,driver_id,ride_id,title,body,data,is_read,created_at&limit=1`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (structureResponse.ok) {
            console.log('✅ Estructura de tabla verificada - todas las columnas existen');
        } else {
            console.log('❌ Error al verificar estructura:', structureResponse.status);
            const errorText = await structureResponse.text();
            console.log('Error details:', errorText);
            
            // Si el error es específico de la columna body
            if (errorText.includes('body') && errorText.includes('schema cache')) {
                console.log('🚨 PROBLEMA IDENTIFICADO: La columna "body" no existe en la tabla notifications');
                console.log('💡 SOLUCIÓN: Ejecuta el script database/safe-fix-notifications.sql en Supabase Dashboard');
            }
        }

        // 3. Probar inserción de notificación
        console.log('\n🧪 3. Probando inserción de notificación...');
        
        // Obtener datos de prueba
        const driversResponse = await fetch(`${supabaseUrl}/rest/v1/drivers?select=id&limit=1`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        const ridesResponse = await fetch(`${supabaseUrl}/rest/v1/ride_requests?select=id&limit=1`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (driversResponse.ok && ridesResponse.ok) {
            const drivers = await driversResponse.json();
            const rides = await ridesResponse.json();

            if (drivers.length > 0 && rides.length > 0) {
                const testNotification = {
                    driver_id: drivers[0].id,
                    ride_id: rides[0].id,
                    title: '🧪 Diagnóstico de Notificación',
                    body: 'Esta es una notificación de diagnóstico para verificar que la tabla funciona correctamente.',
                    data: { test: true, timestamp: new Date().toISOString() }
                };

                console.log('📝 Insertando notificación de prueba...');
                const insertResponse = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(testNotification)
                });

                if (insertResponse.ok) {
                    const result = await insertResponse.json();
                    console.log('✅ Inserción de prueba exitosa:', result[0].id);
                    
                    // Limpiar notificación de prueba
                    setTimeout(async () => {
                        const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/notifications?id=eq.${result[0].id}`, {
                            method: 'DELETE',
                            headers: {
                                'apikey': supabaseKey,
                                'Authorization': `Bearer ${supabaseKey}`
                            }
                        });

                        if (deleteResponse.ok) {
                            console.log('🧹 Notificación de prueba eliminada');
                        }
                    }, 2000);
                } else {
                    const errorText = await insertResponse.text();
                    console.log('❌ Error en inserción de prueba:', insertResponse.status);
                    console.log('Error details:', errorText);
                    
                    if (errorText.includes('body') && errorText.includes('schema cache')) {
                        console.log('🚨 CONFIRMADO: El problema es que la columna "body" no existe');
                        console.log('📋 INSTRUCCIONES:');
                        console.log('1. Ve a Supabase Dashboard → SQL Editor');
                        console.log('2. Ejecuta el script: database/safe-fix-notifications.sql');
                        console.log('3. Verifica que se ejecute sin errores');
                        console.log('4. Prueba nuevamente la asignación de conductor');
                    }
                }
            } else {
                console.log('⚠️ No hay drivers o rides disponibles para la prueba');
            }
        } else {
            console.log('⚠️ No se pudieron obtener datos de prueba');
        }

        // 4. Verificar datos existentes
        console.log('\n📊 4. Verificando datos existentes...');
        const dataResponse = await fetch(`${supabaseUrl}/rest/v1/notifications?select=id,title,body,created_at&limit=5`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (dataResponse.ok) {
            const data = await dataResponse.json();
            console.log(`📈 Total de notificaciones: ${data.length}`);
            if (data.length > 0) {
                console.log('📝 Últimas notificaciones:');
                data.forEach(notification => {
                    console.log(`  - ${notification.title}: ${notification.body ? notification.body.substring(0, 50) + '...' : 'SIN BODY'}`);
                });
            }
        } else {
            console.log('⚠️ No se pudieron obtener datos existentes');
        }

    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
    }
    
    console.log('\n✅ === DIAGNÓSTICO COMPLETADO ===');
}

// Función para ejecutar diagnóstico completo
window.diagnoseNotifications = diagnoseNotificationsIssue;

// Función para probar inserción específica
async function testNotificationInsert() {
    console.log('🧪 === PRUEBA DE INSERCIÓN ESPECÍFICA ===');
    
    // Verificar que CONFIG esté disponible
    if (typeof CONFIG === 'undefined') {
        console.error('❌ CONFIG no está disponible. Asegúrate de que config.js esté cargado.');
        return;
    }
    
    const supabaseUrl = CONFIG.SUPABASE_URL;
    const supabaseKey = CONFIG.SUPABASE_ANON_KEY;
    
    try {
        // Obtener datos de prueba
        const driversResponse = await fetch(`${supabaseUrl}/rest/v1/drivers?select=id&limit=1`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        const ridesResponse = await fetch(`${supabaseUrl}/rest/v1/ride_requests?select=id&limit=1`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
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
            title: '🧪 Prueba de Inserción',
            body: 'Esta es una notificación de prueba para verificar que la inserción funciona.',
            data: { test: true, timestamp: new Date().toISOString() }
        };

        console.log('📝 Insertando notificación de prueba...');
        console.log('Datos:', testNotification);

        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(testNotification)
        });

        if (insertResponse.ok) {
            const result = await insertResponse.json();
            console.log('✅ Notificación insertada exitosamente:', result[0]);
            
            // Limpiar notificación de prueba
            setTimeout(async () => {
                const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/notifications?id=eq.${result[0].id}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });

                if (deleteResponse.ok) {
                    console.log('🧹 Notificación de prueba eliminada');
                }
            }, 3000);
        } else {
            const errorText = await insertResponse.text();
            console.log('❌ Error al insertar notificación:', insertResponse.status);
            console.log('Error details:', errorText);
        }

    } catch (error) {
        console.error('❌ Error en prueba de inserción:', error);
    }
}

window.testNotificationInsert = testNotificationInsert;

console.log('🔧 NotificationsDiagnostic cargado. Usa:');
console.log('- diagnoseNotifications() para diagnóstico completo');
console.log('- testNotificationInsert() para prueba de inserción específica');
