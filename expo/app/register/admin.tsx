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
    View,
} from 'react-native';
import CountryPicker, { Country, getCallingCode } from 'react-native-country-picker-modal';
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

export default function AdminRegistration() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    adminCode: '',
    department: '',
    position: '',
  });
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const phoneInput = useRef<any>(null);
  const router = useRouter();
  const { login, verifyCode } = useAuth();

  // Códigos de autorización válidos (en producción esto debería estar en una base de datos segura)
  const VALID_ADMIN_CODES = ['ADMIN2024', 'SUPERADMIN', 'TAXIZKT_ADMIN'];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu nombre completo.');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      Alert.alert('Error', 'Por favor ingresa un email válido.');
      return false;
    }
    if (!phoneInput.current?.isValidNumber(formData.phoneNumber)) {
      Alert.alert('Error', 'Por favor ingresa un número de teléfono válido.');
      return false;
    }
    if (!formData.adminCode.trim()) {
      Alert.alert('Error', 'Por favor ingresa el código de administrador.');
      return false;
    }
    if (!VALID_ADMIN_CODES.includes(formData.adminCode.toUpperCase())) {
      Alert.alert('Error', 'Código de administrador inválido.');
      return false;
    }
    if (!formData.department.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu departamento.');
      return false;
    }
    if (!formData.position.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu cargo.');
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
      console.log('AdminRegistration: Sincronizando con Supabase...');
      const syncResult = await syncUserWithSupabase(firebaseUser);
      
      if (!syncResult) {
        console.warn('AdminRegistration: Error sincronizando con Supabase');
      } else {
        console.log('AdminRegistration: Usuario sincronizado con Supabase exitosamente');
      }

      Alert.alert(
        'Registro Exitoso',
        'Tu cuenta de administrador ha sido creada exitosamente.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/admin/admin_home')
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
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Registro de Administrador</Text>
          <Text style={styles.subtitle}>Acceso administrativo a la plataforma</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Personal</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre Completo</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Ingresa tu nombre completo"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="tu@email.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Administrativa</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de Administrador</Text>
              <TextInput
                style={styles.input}
                value={formData.adminCode}
                onChangeText={(value) => handleInputChange('adminCode', value)}
                placeholder="Código de autorización"
                placeholderTextColor="#666"
                autoCapitalize="characters"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Departamento</Text>
              <TextInput
                style={styles.input}
                value={formData.department}
                onChangeText={(value) => handleInputChange('department', value)}
                placeholder="Ej: Operaciones, IT, Marketing"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cargo</Text>
              <TextInput
                style={styles.input}
                value={formData.position}
                onChangeText={(value) => handleInputChange('position', value)}
                placeholder="Ej: Gerente, Supervisor, Coordinador"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Solo personal autorizado puede registrarse como administrador.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleSendCode}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Enviando...' : 'Registrarse como Administrador'}
            </Text>
          </TouchableOpacity>

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
    backgroundColor: '#1a1a2e',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4facfe',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#3a3a4e',
  },
  phoneContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a4e',
    overflow: 'hidden',
  },
  flagButton: {
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#3a3a4e',
  },
  dropDownImage: {
    color: '#ffffff',
    fontSize: 12,
    marginLeft: 5,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 15,
  },
  textInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#ffffff',
  },
  phoneInputContainer: {
    marginTop: 0,
  },
  warningBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderWidth: 1,
    borderColor: '#ffc107',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  warningText: {
    color: '#ffc107',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  registerButton: {
    backgroundColor: '#4facfe',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  registerButtonDisabled: {
    backgroundColor: '#4a4a5e',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#a0a0a0',
    fontSize: 16,
  },
}); 