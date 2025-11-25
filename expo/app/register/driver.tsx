import { useAuth } from '@/contexts/AuthContext';
import { syncUserWithSupabase } from '@/services/authService';
import { getAuthInstanceAsync } from '@/services/firebaseConfig';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import CountryPicker, { Country, getCallingCode } from 'react-native-country-picker-modal';
import GoogleSignInButton from '../../src/services/GoogleSignInButton';
import ModalVerificacion from '../ModalVerificacion';

const dropDown = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAi0lEQVRYR+3WuQ6AIBRE0eHL1T83FBqU5S1szdiY2NyTKcCAzU/Y3AcBXIALcIF0gRPAsehgugDEXnYQrUC88RIgfpuJ+MRrgFmILN4CjEYU4xJgFKIa1wB6Ec24FuBFiHELwIpQxa0ALUId9wAkhCmuBdQQ5ngP4I9wxXsBDyJ9m+8y/g9wAS7ABW4giBshQZji3AAAAABJRU5ErkJggg==";

interface CustomPhoneInputProps {
  defaultValue?: string;
  defaultCode?: string;
  onChangeFormattedText?: (text: string) => void;
  containerStyle?: any;
  textContainerStyle?: any;
  textInputProps?: any;
  codeTextStyle?: any;
  disabled?: boolean;
  withShadow?: boolean;
  withDarkTheme?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  disableArrowIcon?: boolean;
  flagButtonStyle?: any;
  renderDropdownImage?: React.ReactNode;
  countryPickerProps?: any;
  filterProps?: any;
  countryPickerButtonStyle?: any;
}

const CustomPhoneInput = React.forwardRef<TextInput, CustomPhoneInputProps>(({
  defaultValue = '',
  defaultCode = 'SV',
  onChangeFormattedText,
  containerStyle,
  textContainerStyle,
  textInputProps = {},
  codeTextStyle = {},
  disabled = false,
  withShadow = false,
  withDarkTheme = false,
  autoFocus = false,
  placeholder = 'Phone Number',
  disableArrowIcon = false,
  flagButtonStyle,
  renderDropdownImage,
  countryPickerProps = {},
  filterProps = {},
  countryPickerButtonStyle,
}, ref) => {
  const [phoneNumber, setPhoneNumber] = useState(defaultValue);
  const [countryCode, setCountryCode] = useState<Country['cca2']>(defaultCode as Country['cca2']);
  const [modalVisible, setModalVisible] = useState(false);
  const [callingCode, setCallingCode] = useState('');

  React.useEffect(() => {
    const loadCallingCode = async () => {
      const code = await getCallingCode(countryCode);
      setCallingCode(code);
    };
    loadCallingCode();
  }, [countryCode]);

  const handleChangeText = (text: string) => {
    setPhoneNumber(text);
    if (onChangeFormattedText) {
      onChangeFormattedText(text);
    }
  };

  const onSelect = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
  };

  const isValidNumber = (number: string) => {
    const phoneNumber = number.replace(/\D/g, '');
    return phoneNumber.length >= 8;
  };

  const getNumberAfterPossiblyEliminatingZero = () => {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const formattedNumber = `+${callingCode}${cleanNumber}`;
    return {
      formattedNumber,
      number: cleanNumber,
      countryCode: countryCode,
      callingCode: callingCode
    };
  };

  React.useImperativeHandle(ref, () => ({
    isValidNumber,
    getNumberAfterPossiblyEliminatingZero,
    ...(ref as any)?.current
  }));

  return (
    <View style={[styles.phoneContainer, containerStyle]}>
      <TouchableOpacity
        style={[styles.flagButton, flagButtonStyle, countryPickerButtonStyle]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
      >
        <CountryPicker
          onSelect={onSelect}
          withEmoji
          withFilter
          withFlag
          filterProps={filterProps}
          countryCode={countryCode}
          withCallingCode
          disableNativeModal={disabled}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          {...countryPickerProps}
        />
        {!disableArrowIcon && (
          <Text style={styles.dropDownImage}>▼</Text>
        )}
      </TouchableOpacity>
      <View style={[styles.textContainer, textContainerStyle]}>
        {callingCode && (
          <Text style={[styles.codeText, codeTextStyle]}>{`+${callingCode}`}</Text>
        )}
        <TextInput
          ref={ref}
          style={[styles.textInput, textInputProps.style]}
          value={phoneNumber}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          editable={!disabled}
          autoFocus={autoFocus}
          keyboardType="number-pad"
          {...textInputProps}
        />
      </View>
    </View>
  );
});

export default function DriverRegistration() {
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
  });
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const phoneInput = useRef<any>(null);
  const router = useRouter();
  const { login, verifyCode } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.phoneNumber.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu número de teléfono.');
      return false;
    }
    return true;
  };

  const handleSendCode = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const formatted = phoneInput.current?.getNumberAfterPossiblyEliminatingZero();
      if (!formatted?.formattedNumber) {
        Alert.alert('Error', 'No se pudo obtener el número formateado.');
        return;
      }

      const confirmation = await login(formatted.formattedNumber);
      setConfirmResult(confirmation);
      setShowModal(true);
    } catch (error: any) {
      console.error('Error al enviar el código:', error);
      Alert.alert('Error', 'No se pudo enviar el código de verificación. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = async (uid: string) => {
    try {
      setLoading(true);
      
      // Obtener el usuario actual de Firebase
      const auth = await getAuthInstanceAsync();
      const firebaseUser = auth.currentUser;
      
      if (!firebaseUser) {
        throw new Error('No hay usuario autenticado');
      }
      
      // Sincronizar con Supabase
      console.log('DriverRegistration: Sincronizando con Supabase...');
      const syncResult = await syncUserWithSupabase(firebaseUser);
      
      if (!syncResult) {
        console.warn('DriverRegistration: Error sincronizando con Supabase');
      } else {
        console.log('DriverRegistration: Usuario sincronizado con Supabase exitosamente');
      }

      Alert.alert(
        'Registro Exitoso',
        'Tu cuenta de conductor ha sido creada. Está pendiente de verificación por administración.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/driver/driver_home')
          }
        ]
      );
    } catch (error) {
      console.error('Error al crear perfil:', error);
      Alert.alert('Error', 'No se pudo completar el registro. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    try {
      await verifyCode(confirmResult, code);
      const formatted = phoneInput.current?.getNumberAfterPossiblyEliminatingZero();
      await handleVerificationSuccess(formatted?.formattedNumber || formData.phoneNumber);
    } catch (error: any) {
      console.error('Error al verificar código:', error);
      Alert.alert('Error', 'Código inválido. Intenta de nuevo.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Registro de Conductor</Text>
        </View>
        <View style={styles.form}>
          {/* Tarjeta de registro con teléfono */}
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                value={formData.name}
                onChangeText={text => handleInputChange('name', text)}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Número de Teléfono</Text>
              <CustomPhoneInput
                ref={phoneInput}
                onChangeFormattedText={(text) => handleInputChange('phoneNumber', text)}
                placeholder="Número de teléfono"
                containerStyle={styles.phoneInputContainer}
              />
            </View>
            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? 'Enviando...' : 'Registrarse como Conductor'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tarjeta de registro con Google */}
          <View style={styles.card}>
            <GoogleSignInButton onSuccess={() => router.replace('/driver/driver_home')} />
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ModalVerificacion
        visible={showModal}
        onClose={() => setShowModal(false)}
        onVerify={handleVerifyCode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#11181C',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  form: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#11181C',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  phoneContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  flagButton: {
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  dropDownImage: {
    color: '#2563EB',
    fontSize: 12,
    marginLeft: 5,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    color: '#2563EB',
    fontSize: 16,
    marginLeft: 15,
  },
  textInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#11181C',
  },
  phoneInputContainer: {
    marginTop: 0,
  },
  registerButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  registerButtonDisabled: {
    backgroundColor: '#4a4a5e',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DADCE0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginBottom: 0,
    marginTop: 0,
    width: '100%',
  },
  googleLogo: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#11181C',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 