import openStreetMapService, { GeocodingResult } from '@/services/openStreetMapService';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface OpenStreetPlacesAutocompleteProps {
  placeholder?: string;
  onPlaceSelected?: (place: GeocodingResult) => void;
  onTextChange?: (text: string) => void;
  style?: any;
  inputStyle?: any;
  listStyle?: any;
  itemStyle?: any;
  debounceMs?: number;
  minLength?: number;
}

const OpenStreetPlacesAutocomplete: React.FC<OpenStreetPlacesAutocompleteProps> = ({
  placeholder = 'Buscar dirección...',
  onPlaceSelected,
  onTextChange,
  style,
  inputStyle,
  listStyle,
  itemStyle,
  debounceMs = 300,
  minLength = 3,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= minLength) {
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const searchResults = await openStreetMapService.searchPlaces(query);
          setResults(searchResults);
          setShowResults(true);
        } catch (error) {
          console.error('Error buscando lugares:', error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    } else {
      setResults([]);
      setShowResults(false);
      setLoading(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, minLength, debounceMs, openStreetMapService]);

  const handleTextChange = (text: string) => {
    setQuery(text);
    onTextChange?.(text);
  };

  const handlePlaceSelect = (place: GeocodingResult) => {
    setQuery(place.display_name);
    setShowResults(false);
    onPlaceSelected?.(place);
  };

  const renderPlaceItem = ({ item }: { item: GeocodingResult }) => (
    <TouchableOpacity
      style={[styles.placeItem, itemStyle]}
      onPress={() => handlePlaceSelect(item)}
    >
      <Text style={styles.placeName} numberOfLines={2}>
        {item.display_name}
      </Text>
      <Text style={styles.placeType}>
        {item.type} • Importancia: {item.importance.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  const renderSeparator = () => <View style={styles.separator} />;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, inputStyle]}
          value={query}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {loading && (
          <ActivityIndicator
            style={styles.loadingIndicator}
            size="small"
            color="#007AFF"
          />
        )}
      </View>

      {showResults && results.length > 0 && (
        <View style={[styles.resultsContainer, listStyle]}>
          <FlatList
            data={results}
            renderItem={renderPlaceItem}
            keyExtractor={(item) => `${item.lat}-${item.lon}`}
            ItemSeparatorComponent={renderSeparator}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          />
        </View>
      )}

      {showResults && results.length === 0 && !loading && query.length >= minLength && (
        <View style={[styles.resultsContainer, listStyle]}>
          <Text style={styles.noResults}>No se encontraron resultados</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingRight: 40,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  resultsContainer: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultsList: {
    flex: 1,
  },
  placeItem: {
    padding: 15,
    backgroundColor: '#fff',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  placeType: {
    fontSize: 12,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 15,
  },
  noResults: {
    padding: 15,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});

export default OpenStreetPlacesAutocomplete; 