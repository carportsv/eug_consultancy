// Script para calcular distancias faltantes en viajes existentes
// Ejecutar desde la consola del navegador en la página de administración

async function calculateMissingDistances() {
    try {
        console.log('🔧 Calculando distancias faltantes...');
        
        // Obtener configuración
        const supabaseUrl = CONFIG.SUPABASE_URL;
        const supabaseKey = CONFIG.SUPABASE_ANON_KEY;
        
        // Obtener viajes sin distancia
        const response = await fetch(`${supabaseUrl}/rest/v1/ride_requests?distance=is.null&select=*`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        const rides = await response.json();
        console.log(`📊 Encontrados ${rides.length} viajes sin distancia`);
        
        if (rides.length === 0) {
            console.log('✅ Todos los viajes ya tienen distancia calculada');
            return;
        }
        
        // Calcular distancia para cada viaje
        for (const ride of rides) {
            try {
                console.log(`🔍 Procesando viaje ${ride.id}...`);
                
                // Verificar que tenga coordenadas
                if (!ride.origin?.coordinates || !ride.destination?.coordinates) {
                    console.log(`⚠️ Viaje ${ride.id} no tiene coordenadas completas, saltando...`);
                    continue;
                }
                
                const origin = {
                    lat: ride.origin.coordinates.latitude,
                    lng: ride.origin.coordinates.longitude
                };
                
                const destination = {
                    lat: ride.destination.coordinates.latitude,
                    lng: ride.destination.coordinates.longitude
                };
                
                // Calcular distancia usando OSRM
                const distance = await calculateDistance(origin, destination);
                
                if (distance > 0) {
                    // Actualizar el viaje con la distancia calculada
                    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/ride_requests?id=eq.${ride.id}`, {
                        method: 'PATCH',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            distance: distance // en metros
                        })
                    });
                    
                    if (updateResponse.ok) {
                        console.log(`✅ Viaje ${ride.id} actualizado con distancia: ${(distance/1000).toFixed(1)} km`);
                    } else {
                        console.log(`❌ Error actualizando viaje ${ride.id}`);
                    }
                } else {
                    console.log(`⚠️ No se pudo calcular distancia para viaje ${ride.id}`);
                }
                
                // Pequeña pausa para no sobrecargar el servidor
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`❌ Error procesando viaje ${ride.id}:`, error);
            }
        }
        
        console.log('✅ Proceso completado');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Función auxiliar para calcular distancia usando OSRM
async function calculateDistance(origin, destination) {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
            return data.routes[0].distance; // distancia en metros
        }
        
        return 0;
    } catch (error) {
        console.error('Error calculando distancia:', error);
        return 0;
    }
}

// Ejecutar automáticamente
calculateMissingDistances();
