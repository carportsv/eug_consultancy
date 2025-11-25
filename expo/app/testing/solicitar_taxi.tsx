import OpenStreetMap from '@/components/OpenStreetMap';
import PlaceInput from '@/components/PlaceInput';
import openStreetMapService, { LocationCoords } from '@/services/openStreetMapService';
import { supabase } from '@/services/supabaseClient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';

export default function TestingSolicitarTaxi(): React.JSX.Element {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const panelRatio = 0.30; // objetivo final: 30%
  const metricsOffset = React.useMemo(() => {
    if (height < 680) return -40;
    if (height < 740) return -35;
    if (height < 820) return -24;
    return -12;
  }, [height]);
  const metricsPaddingTop = height < 720 ? 2 : 4;
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoords, setOriginCoords] = useState<LocationCoords | null>(null);
  const [destCoords, setDestCoords] = useState<LocationCoords | null>(null);
  const [estim, setEstim] = useState<{ km: number; min: number; price: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [selectedField, setSelectedField] = useState<'origin' | 'destination'>('origin');
  const [driverToUser, setDriverToUser] = useState<{ km: number; min: number } | null>(null);
  const autoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [routeToDestCoords, setRouteToDestCoords] = useState<LocationCoords[] | null>(null);
  const [driverToUserCoords, setDriverToUserCoords] = useState<LocationCoords[] | null>(null);

  // Obtener ubicación real del dispositivo
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'No se pudo obtener la ubicación actual.');
          setLoadingLocation(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!isMounted) return;
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCurrentLocation(coords);
      } catch (e) {
        console.warn('[TestingSolicitarTaxi] Error obteniendo ubicación:', e);
      } finally {
        if (isMounted) setLoadingLocation(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const canEstimate = useMemo(() => !!originCoords && !!destCoords, [originCoords, destCoords]);

  const getCoords = async (text: string): Promise<LocationCoords | null> => {
    const coords = await openStreetMapService.getCoordsFromAddress(text);
    return coords;
  };

  const estimate = async () => {
    if (!canEstimate) return;
    try {
      const route = await openStreetMapService.getRoute(originCoords!, destCoords!);
      if (route) {
        const km = route.totalDistance / 1000;
        const min = Math.round(route.totalDuration / 60);
        const price = Math.max(2, Math.round((2 + Math.max(0, km - 5) * 0.5) * 100) / 100);
        setEstim({ km, min, price });
        const coords = route.points.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
        setRouteToDestCoords(coords);
      }
    } catch {}
  };

  // Auto-estimación en background con debounce cuando haya ambos puntos
  useEffect(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
    }
    if (originCoords && destCoords) {
      autoTimerRef.current = setTimeout(() => {
        estimate();
      }, 600);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [originCoords?.latitude, originCoords?.longitude, destCoords?.latitude, destCoords?.longitude]);

  // Calcular ETA del driver más cercano al origen
  useEffect(() => {
    const calcDriverEta = async () => {
      try {
        if (!originCoords || availableDrivers.length === 0) {
          setDriverToUser(null);
          return;
        }
        // elegir driver más cercano por distancia haversine aproximada
        const validDrivers = availableDrivers.filter((d: any) => d?.location?.latitude && d?.location?.longitude);
        if (validDrivers.length === 0) {
          setDriverToUser(null);
          return;
        }
        const haversine = (a: LocationCoords, b: LocationCoords) => {
          const R = 6371; // km
          const dLat = (b.latitude - a.latitude) * Math.PI / 180;
          const dLng = (b.longitude - a.longitude) * Math.PI / 180;
          const la1 = a.latitude * Math.PI / 180;
          const lb1 = b.latitude * Math.PI / 180;
          const x = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(lb1)*Math.sin(dLng/2)**2;
          return 2 * R * Math.asin(Math.sqrt(x));
        };
        let nearest = validDrivers[0];
        let bestDist = haversine(validDrivers[0].location, originCoords);
        for (let i = 1; i < validDrivers.length; i++) {
          const d = haversine(validDrivers[i].location, originCoords);
          if (d < bestDist) { bestDist = d; nearest = validDrivers[i]; }
        }
        // ruta real con OSRM
        const route = await openStreetMapService.getRoute(nearest.location, originCoords);
        if (route) {
          setDriverToUser({ km: route.totalDistance / 1000, min: Math.round(route.totalDuration / 60) });
          const coords = route.points.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
          setDriverToUserCoords(coords);
        } else {
          setDriverToUserCoords(null);
        }
      } catch (e) {
        console.warn('[TestingSolicitarTaxi] Error calculando ETA driver→user:', e);
      }
    };
    calcDriverEta();
  }, [originCoords?.latitude, originCoords?.longitude, availableDrivers.length]);

  const handleConfirm = () => {
    if (!estim || !originCoords || !destCoords) {
      Alert.alert('Falta estimación', 'Ingresa origen y destino y presiona "Calcular".');
      return;
    }
    router.push({
      pathname: '/testing/solicitar_taxi_summary',
      params: {
        origin,
        destination,
        ox: String(originCoords.latitude),
        oy: String(originCoords.longitude),
        dx: String(destCoords.latitude),
        dy: String(destCoords.longitude),
        km: String(estim.km),
        min: String(estim.min),
        price: String(estim.price),
      },
    });
  };

  // Cargar conductores disponibles (solo para el prototipo)
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('id, location, is_available, status')
          .eq('status', 'active');
        if (!error && data) setAvailableDrivers(data);
      } catch (e) {
        console.warn('[TestingSolicitarTaxi] Error cargando drivers:', e);
      }
    };
    loadDrivers();

    // Suscripción realtime para mantenerlo 100% en vivo
    const channel = supabase
      .channel('drivers_live_testing')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        () => {
          // Cargar lista fresca ante cualquier cambio
          loadDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const mapMarkers = [] as any[];
  if (originCoords) mapMarkers.push({ id: 'o', latitude: originCoords.latitude, longitude: originCoords.longitude, title: 'Origen', color: '#2563EB' });
  if (destCoords) mapMarkers.push({ id: 'd', latitude: destCoords.latitude, longitude: destCoords.longitude, title: 'Destino', color: '#F59E42' });
  // Marcadores de conductores (verdes disponibles, grises no disponibles)
  mapMarkers.push(
    ...availableDrivers
      .filter(d => d?.location?.latitude && d?.location?.longitude)
      .map((d: any, idx: number) => ({
        id: `driver-${d.id}-${idx}`,
        latitude: d.location.latitude,
        longitude: d.location.longitude,
        title: d.is_available ? 'Conductor disponible' : 'Conductor',
        color: d.is_available ? '#10B981' : '#9CA3AF',
      }))
  );

  const mapCenter = originCoords || destCoords || currentLocation || null;
  const mapPolylines = React.useMemo(() => {
    const lines: Array<{ id: string; coordinates: LocationCoords[]; color: string; width: number }> = [];
    if (driverToUserCoords && driverToUserCoords.length > 1) {
      lines.push({ id: 'driverToUser', coordinates: driverToUserCoords, color: '#2563EB', width: 4 });
    }
    if (routeToDestCoords && routeToDestCoords.length > 1) {
      lines.push({ id: 'originToDest', coordinates: routeToDestCoords, color: '#EF4444', width: 4 });
    }
    return lines;
  }, [driverToUserCoords, routeToDestCoords]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🚕 Prototipo Solicitar Taxi</Text>
      </View>

      <View style={[
        styles.panelContainer,
        (() => {
          const hasOrigin = !!originCoords;
          const hasDest = !!destCoords;
          const ratio = 0.18 + (hasOrigin ? 0.08 : 0) + (hasDest ? 0.06 : 0); // 18% → 26% → 32%
          const minH = hasDest ? 220 : hasOrigin ? 180 : 130;
          return { height: Math.max(minH, Math.round(height * ratio)) };
        })()
      ]}> 
      {(height < 720 ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 4 }]}>
          <Text style={styles.sectionTitle}>Ingresa origen y destino</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, styles.secondary]} onPress={estimate} disabled={!canEstimate}>
              <Text style={[styles.actionText, !canEstimate && { opacity: 0.5 }]}>Calcular</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.primary]} onPress={handleConfirm} disabled={!estim}>
              <Text style={styles.actionText}>Confirmar</Text>
            </TouchableOpacity>
          </View>

          <PlaceInput
            placeholder="Punto de inicio"
            onPress={(data) => {
              setOrigin(data.description);
              if (data.coordinates) setOriginCoords(data.coordinates);
              setSelectedField('destination');
            }}
            value={origin}
            onChangeText={setOrigin}
            userLocation={currentLocation || undefined}
          />

          {originCoords && (
            <PlaceInput
              placeholder="Destino"
              onPress={(data) => {
                setDestination(data.description);
                if (data.coordinates) setDestCoords(data.coordinates);
              }}
              value={destination}
              onChangeText={setDestination}
              userLocation={currentLocation || undefined}
            />
          )}

          {/* Estimación inline removida; ahora se muestra en la sección de métricas */}
        </ScrollView>
      ) : (
        <View style={[styles.content, { paddingBottom: 4 }]}>
        <Text style={styles.sectionTitle}>Ingresa origen y destino</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.secondary]} onPress={estimate} disabled={!canEstimate}>
            <Text style={[styles.actionText, !canEstimate && { opacity: 0.5 }]}>Calcular</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.primary]} onPress={handleConfirm} disabled={!estim}>
            <Text style={styles.actionText}>Confirmar</Text>
          </TouchableOpacity>
        </View>

        <PlaceInput
          placeholder="Punto de inicio"
          onPress={(data) => {
            setOrigin(data.description);
            if (data.coordinates) setOriginCoords(data.coordinates);
            setSelectedField('destination');
          }}
          value={origin}
          onChangeText={setOrigin}
          styles={{
            container: { marginBottom: 6 },
            inputContainer: { paddingVertical: 6, minHeight: 36 },
            input: { fontSize: 13, paddingVertical: 0 },
            suggestionText: { fontSize: 13 },
          }}
          textInputProps={{ onFocus: () => setSelectedField('origin') }}
          userLocation={currentLocation || undefined}
        />

        {originCoords && (
          <PlaceInput
            placeholder="Destino"
            onPress={(data) => {
              setDestination(data.description);
              if (data.coordinates) setDestCoords(data.coordinates);
            }}
            value={destination}
            onChangeText={setDestination}
            styles={{
              container: { marginBottom: 6 },
              inputContainer: { paddingVertical: 6, minHeight: 36 },
              input: { fontSize: 13, paddingVertical: 0 },
              suggestionText: { fontSize: 13 },
            }}
            textInputProps={{ onFocus: () => setSelectedField('destination') }}
            userLocation={currentLocation || undefined}
          />
        )}

          {/* Estimación inline removida; ahora se muestra en la sección de métricas */}
        </View>
      ))}
      </View>

      {/* Métricas bajo panel: solo cuando ya hay destino */}
      {destCoords && (
        <View style={[styles.metricsPanel, { marginTop: -25, paddingTop: 4 }]}>
          <View style={styles.metricRow}>
            <MaterialIcons name="attach-money" size={18} color="#10B981" />
            <Text style={styles.metricLabel}>Precio estimado</Text>
            <Text style={styles.metricValue}>{estim ? `$${estim.price.toFixed(2)}` : '—'}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.metricRow}>
            <MaterialIcons name="directions-car" size={18} color="#2563EB" />
            <Text style={styles.metricLabel}>Conductor → Usuario</Text>
            <Text style={styles.metricValue}>{driverToUser ? `${driverToUser.min} min · ${driverToUser.km.toFixed(1)} km` : '—'}</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.metricRow}>
            <MaterialIcons name="flag" size={18} color="#EF4444" />
            <Text style={styles.metricLabel}>Origen → Destino</Text>
            <Text style={styles.metricValue}>{estim ? `${estim.min} min · ${estim.km.toFixed(1)} km` : '—'}</Text>
          </View>
        </View>
      )}

      <View style={styles.mapContainer}>
        {!mapCenter ? (
          <View style={styles.mapLoading}> 
            {loadingLocation ? (
              <>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={{ marginTop: 8, color: '#6B7280' }}>Obteniendo tu ubicación...</Text>
              </>
            ) : (
              <Text style={{ color: '#6B7280' }}>Selecciona origen o destino para continuar</Text>
            )}
          </View>
        ) : (
          <OpenStreetMap 
            latitude={mapCenter.latitude} 
            longitude={mapCenter.longitude} 
            zoom={13} 
            markers={mapMarkers}
            polylines={mapPolylines}
            style={{ flex: 1 }}
            onMapPress={async (lat: number, lng: number) => {
              const address = await openStreetMapService.getAddressFromCoords(lat, lng);
              const coords = { latitude: lat, longitude: lng };
              if (selectedField === 'origin') {
                setOrigin(address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                setOriginCoords(coords);
                setSelectedField('destination');
              } else {
                setDestination(address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                setDestCoords(coords);
              }
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomColor: '#E5E7EB', borderBottomWidth: 1 },
  backButton: { padding: 6, marginRight: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  panelContainer: { },
  mapContainer: { flex: 1 },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  content: { paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  input: { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 0 },
  actions: { flexDirection: 'row', gap: 6, marginTop: 6, marginBottom: 6 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  primary: { backgroundColor: '#2563EB' },
  secondary: { backgroundColor: '#F3F4F6' },
  actionText: { color: '#111827', fontWeight: '700' },
  estimateCard: { marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  estimateTitle: { fontWeight: '700', fontSize: 12, color: '#111827', marginBottom: 2 },
  estimateText: { color: '#374151', fontSize: 12, lineHeight: 16 },
  estimateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  estimateBadge: { backgroundColor: '#EEF2FF', color: '#4338CA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 11, fontWeight: '700' },
  estimateValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  estimateSmall: { fontSize: 12, color: '#6B7280' },
  estimateDot: { color: '#9CA3AF' },
  metricsPanel: { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  metricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metricLabel: { fontSize: 12, color: '#6B7280', flex: 1, marginLeft: 6 },
  metricValue: { fontSize: 12, fontWeight: '700', color: '#111827' },
  rowDivider: { height: 8 },
});


