import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Country {
  cca2: string;
  name: string;
  callingCode: string[];
}

interface CountryPickerProps {
  countryCode: string;
  withFilter?: boolean;
  withFlag?: boolean;
  withCallingCode?: boolean;
  withEmoji?: boolean;
  onSelect: (country: Country) => void;
  visible?: boolean;
  onClose?: () => void;
}

const CountryPickerWrapper: React.FC<CountryPickerProps> = ({
  countryCode,
  withFilter = true,
  withFlag = true,
  withCallingCode = true,
  withEmoji = true,
  onSelect,
  visible = false,
  onClose,
}) => {
  if (Platform.OS === 'web') {
    // Implementación simple para web
    const handleSelect = () => {
      const country: Country = {
        cca2: 'SV',
        name: 'El Salvador',
        callingCode: ['503'],
      };
      onSelect(country);
      onClose?.();
    };

    if (!visible) return null;

    return (
      <View style={styles.webContainer}>
        <View style={styles.webModal}>
          <Text style={styles.webTitle}>Seleccionar País</Text>
          <TouchableOpacity style={styles.webOption} onPress={handleSelect}>
            <Text style={styles.webFlag}>🇸🇻</Text>
            <Text style={styles.webName}>El Salvador (+503)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.webCloseButton} onPress={onClose}>
            <Text style={styles.webCloseText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Para móvil, usar el componente original
  const CountryPicker = require('react-native-country-picker-modal').default;
  return (
    <CountryPicker
      countryCode={countryCode}
      withFilter={withFilter}
      withFlag={withFlag}
      withCallingCode={withCallingCode}
      withEmoji={withEmoji}
      onSelect={onSelect}
      visible={visible}
      onClose={onClose}
    />
  );
};

const styles = StyleSheet.create({
  webContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  webModal: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    minWidth: 300,
    maxWidth: 400,
  },
  webTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  webOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  webFlag: {
    fontSize: 24,
    marginRight: 10,
  },
  webName: {
    fontSize: 16,
  },
  webCloseButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  webCloseText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default CountryPickerWrapper;
export type { Country };

