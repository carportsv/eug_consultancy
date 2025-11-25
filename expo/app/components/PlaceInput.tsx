import openStreetMapService from '@/services/openStreetMapService';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export interface PlaceInputProps {
  placeholder: string;
  onPress: (data: { description: string; place_id: string; coordinates?: { latitude: number; longitude: number } }) => void;
  styles?: any;
  textInputProps?: any;
  value?: string;
  onChangeText?: (text: string) => void;
  userLocation?: { latitude: number; longitude: number };
}

export default function PlaceInput({ 
  placeholder, 
  onPress, 
  styles = {}, 
  textInputProps = {},
  value,
  onChangeText,
  userLocation
}: PlaceInputProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<{ description: string; place_id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingCoordinates, setIsGettingCoordinates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  const handleInputChange = (text: string) => {
    setInputValue(text);
    setError(null);
    onChangeText?.(text);
    
    // Cancelar búsqueda anterior si existe
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (text.length >= 2) {
      // Debounce optimizado de 250ms para respuesta más rápida (antes 400ms)
      searchTimeoutRef.current = setTimeout(() => {
        searchPlaces(text);
      }, 250);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionPress = async (suggestion: { description: string; place_id: string }) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    setError(null);
    setIsGettingCoordinates(true);
    
    try {
      // Obtener coordenadas del lugar seleccionado usando geocoding directo
      const coordinates = await openStreetMapService.getCoordsFromAddress(suggestion.description);
      
      if (coordinates) {
        console.log('[PlaceInput] Coordenadas obtenidas para:', suggestion.description, coordinates);
        onPress({
          description: suggestion.description,
          place_id: suggestion.place_id,
          coordinates
        });
      } else {
        console.warn('[PlaceInput] No se pudieron obtener coordenadas para:', suggestion.description);
        // Intentar con búsqueda de lugares como fallback
        const results = await openStreetMapService.searchPlaces(suggestion.description);
        if (results && results.length > 0) {
          const selectedResult = results[0];
          const fallbackCoordinates = {
            latitude: parseFloat(selectedResult.lat),
            longitude: parseFloat(selectedResult.lon)
          };
          
          console.log('[PlaceInput] Coordenadas obtenidas por fallback:', fallbackCoordinates);
          onPress({
            description: suggestion.description,
            place_id: suggestion.place_id,
            coordinates: fallbackCoordinates
          });
        } else {
          console.error('[PlaceInput] No se pudieron obtener coordenadas por ningún método');
          onPress({
            description: suggestion.description,
            place_id: suggestion.place_id
          });
        }
      }
    } catch (error) {
      console.error('[PlaceInput] Error al obtener coordenadas:', error);
      // Continuar sin coordenadas si hay error
      onPress({
        description: suggestion.description,
        place_id: suggestion.place_id
      });
    } finally {
      setIsGettingCoordinates(false);
    }
  };

  const handleFocus = () => {
    // Mostrar sugerencias inmediatamente si hay texto
    if (inputValue.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Retraso reducido para mejor UX (antes 300ms, ahora 150ms)
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  // Buscar lugares usando OpenStreetMap
  const searchPlaces = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const results = await openStreetMapService.searchPlaces(query.trim(), userLocation);
      
      if (results && Array.isArray(results) && results.length > 0) {
        // Filtrar y formatear resultados para usuarios normales
        const places = results
          .filter(result => {
            // Filtrar resultados muy técnicos o poco útiles
            const name = result.display_name.toLowerCase();
            return !name.includes('coordinate') && 
                   !name.includes('lat:') && 
                   !name.includes('lng:') &&
                   !name.includes('gps') &&
                   result.display_name.length > 5;
          })
          .map((result, index) => ({
            description: formatAddressForUser(result.display_name),
            place_id: index.toString(),
          }))
          .slice(0, 6); // Limitar a 6 resultados para mejor UX
        
        setSuggestions(places);
        setShowSuggestions(places.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error en búsqueda de lugares:', error);
      setError('No se pudieron cargar las sugerencias. Intenta de nuevo.');
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Formatear dirección para usuarios normales
  const formatAddressForUser = (address: string): string => {
    // Remover información técnica y formatear para usuario
    let formatted = address;
    
    // Remover códigos postales largos al final
    formatted = formatted.replace(/, \d{5}(-\d{4})?$/, '');
    
    // Remover información de coordenadas
    formatted = formatted.replace(/\([^)]*\)/g, '').trim();
    
    // Limpiar múltiples comas
    formatted = formatted.replace(/,+/g, ',');
    
    // Remover comas al final
    formatted = formatted.replace(/,$/, '');
    
    // Remover información redundante del país
    formatted = formatted.replace(/, El Salvador$/, '');
    formatted = formatted.replace(/, United States$/, '');
    formatted = formatted.replace(/, United States of America$/, '');
    formatted = formatted.replace(/, USA$/, '');
    formatted = formatted.replace(/, México$/, '');
    formatted = formatted.replace(/, Mexico$/, '');
    
    // Remover información de provincia/estado redundante
    formatted = formatted.replace(/, Provincia de [^,]+$/, '');
    formatted = formatted.replace(/, State of [^,]+$/, '');
    
    return formatted;
  };

  const clearInput = () => {
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    onChangeText?.('');
  };



  return (
    <View style={[defaultStyles.container, styles.container]}>
      <View style={[defaultStyles.inputContainer, styles.inputContainer]}>
        <Ionicons name="location" size={20} color="#666" style={defaultStyles.icon} />
        <TextInput
          style={[defaultStyles.input, styles.input]}
          placeholder={placeholder}
          value={inputValue}
          onChangeText={handleInputChange}
          placeholderTextColor="#999"
          onSubmitEditing={() => {}} // Removed handleManualSubmit
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="words"
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...textInputProps}
        />
        {inputValue.length > 0 && (
          <TouchableOpacity onPress={clearInput} style={defaultStyles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
        {isLoading && (
          <ActivityIndicator size="small" color="#2563EB" style={defaultStyles.loader} />
        )}
      </View>

      {error && (
        <Text style={defaultStyles.errorText}>{error}</Text>
      )}

      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <View style={[defaultStyles.suggestionsContainer, styles.suggestionsContainer]}>
          {isLoading && (
            <View style={defaultStyles.suggestionItem}>
              <Text style={{ color: '#666', fontStyle: 'italic', fontSize: 16 }}>
                Buscando...
              </Text>
            </View>
          )}
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={suggestion.place_id}
              style={[
                defaultStyles.suggestionItem,
                styles.suggestionItem,
                index === suggestions.length - 1 && defaultStyles.lastSuggestionItem
              ]}
              onPress={() => handleSuggestionPress(suggestion)}
            >
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={[defaultStyles.suggestionText, styles.suggestionText]} numberOfLines={2}>
                {suggestion.description}
              </Text>
            </TouchableOpacity>
          ))}
          {suggestions.length === 0 && !isLoading && inputValue.length >= 2 && (
            <View style={defaultStyles.suggestionItem}>
              <Text style={{ color: '#666', fontStyle: 'italic', fontSize: 16 }}>
                No se encontraron resultados
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const defaultStyles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 5, // Reducir margen para evitar espacios grandes
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Poppins',
    fontWeight: '500',
  },
  loader: {
    marginLeft: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
    fontFamily: 'Poppins',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 200,
    zIndex: 9999, // Z-index muy alto para asegurar visibilidad
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastSuggestionItem: {
    borderBottomWidth: 0,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    marginLeft: 12,
    fontFamily: 'Poppins',
    fontWeight: '400',
  },
  clearButton: {
    padding: 8,
  },
});