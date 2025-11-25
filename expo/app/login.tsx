import { useAppReady } from '@/contexts/AppReadyContext';
import { useAuth } from '@/contexts/AuthContext';
import { AuthService } from '@/services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from 'react-native';
import CountryPicker, { Country, getCallingCode } from 'react-native-country-picker-modal';
import ModalVerificacion from '../app/ModalVerificacion';
import GoogleSignInButton from './services/GoogleSignInButton';

const dropDown = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAi0lEQVRYR+3WuQ6AIBRE0eHL1T83FBqU5S1szdiY2NyTKcCAzU/Y3AcBXIALcIF0gRPAsehgugDEXnYQrUC88RIgfpuJ+MRrgFmILN4CjEYU4xJgFKIa1wB6Ec24FuBFiHELwIpQxa0ALUId9wAkhCmuBdQQ5ngP4I9wxXsBDyJ9m+8y/g9wAS7ABW4giBshQZji3AAAAABJRU5ErkJggg==";

interface CustomPhoneInputProps {
  defaultValue?: string;
  defaultCode?: string;
  layout?: 'first' | 'second';
  onChangeFormattedText?: (text: string) => void;
  containerStyle?: ViewStyle;
  textContainerStyle?: ViewStyle;
  textInputProps?: TextInputProps;
  codeTextStyle?: TextStyle;
  disabled?: boolean;
  withShadow?: boolean;
  withDarkTheme?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  disableArrowIcon?: boolean;
  flagButtonStyle?: ViewStyle;
  renderDropdownImage?: React.ReactNode;
  countryPickerProps?: any;
  filterProps?: any;
  countryPickerButtonStyle?: ViewStyle;
}

// Componente PhoneInput actualizado
const CustomPhoneInput = React.forwardRef<TextInput, CustomPhoneInputProps>(({
  defaultValue = '',
  defaultCode = 'SV',
  layout = 'first',
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

  // Métodos de validación
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

  // Exponer métodos al ref
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
          <Image
            source={{ uri: dropDown }}
            resizeMode="contain"
            style={styles.dropDownImage}
          />
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

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const hasNavigatedRef = useRef(false);
  const phoneInput = useRef<any>(null);
  const router = useRouter();
  const { login, verifyCode, isAuthenticated, user, userType, refreshAuthState } = useAuth();
  const { appIsReady } = useAppReady();
  const recaptchaVerifier = useRef(null);

  // Función para forzar actualización del contexto después del login con Google
  const handleGoogleAuthComplete = async () => {
    console.log('Login: Google auth completado, forzando actualización del contexto...');
    // Resetear la bandera de navegación para un nuevo login
    hasNavigatedRef.current = false;
    // Forzar actualización del contexto de autenticación
    await refreshAuthState();
    console.log('Login: Contexto actualizado, verificando estado...');
  };

  // Chequeo automático de sesión persistente
  React.useEffect(() => {
    console.log('[Login] useEffect navegación:', { appIsReady, isAuthenticated, user: !!user, userType });
    console.log('[Login] useEffect navegación - condiciones:', { 
      appIsReady, 
      isAuthenticated, 
      user: !!user, 
      userType,
      todasCumplidas: appIsReady && isAuthenticated && user 
    });
    
    if (appIsReady && isAuthenticated && user && !hasNavigatedRef.current) {
      console.log('[Login] Condiciones cumplidas, navegando...');
      hasNavigatedRef.current = true;
      setTimeout(() => {
        if (userType === 'admin') {
          console.log('[Login] Navegando a admin_home');
          router.replace('/admin/admin_home');
        } else if (userType === 'driver') {
          console.log('[Login] Navegando a driver_home');
          router.replace('/driver/driver_home');
        } else {
          console.log('[Login] Navegando a user_home');
          router.replace('/user/user_home');
        }
      }, 200); // Reducir delay de 400ms a 200ms
    }
  }, [appIsReady, isAuthenticated, user, userType, router]);

  const handleSendCode = async () => {
    try {
      const isValid = phoneInput.current?.isValidNumber(phoneNumber);
      if (!isValid) {
        Alert.alert('Número inválido', 'Por favor ingresa un número válido.');
        return;
      }
      const formatted = phoneInput.current?.getNumberAfterPossiblyEliminatingZero();
      if (!formatted?.formattedNumber) {
        Alert.alert('Error', 'No se pudo obtener el número formateado.');
        return;
      }
      
      hasNavigatedRef.current = false;
      
      // Usar el servicio de autenticación
      const confirmation = await AuthService.sendVerificationCode(formatted.formattedNumber);
      setConfirmResult(confirmation);
      setShowModal(true);
      
    } catch (error: any) {
      console.error('Error al enviar el código:', error);
      Alert.alert('Error', error.message || 'No se pudo enviar el código.');
    }
  };

  const handleVerificationSuccess = async (uid: string) => {
    try {
      await AsyncStorage.setItem('userUID', uid);
      
      // Esperar un poco para que el contexto de autenticación se actualice
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Usar el userType del contexto de autenticación (que viene de Supabase)
      console.log('[Login] handleVerificationSuccess - userType del contexto:', userType);
      
      // Navegar según el tipo de usuario del contexto
      if (userType === 'driver') {
        console.log('[Login] Navegando a driver_home (login por teléfono)');
        router.replace('/driver/driver_home');
      } else if (userType === 'admin') {
        console.log('[Login] Navegando a admin_home (login por teléfono)');
        router.replace('/admin/admin_home');
      } else {
        console.log('[Login] Navegando a user_home (login por teléfono)');
        router.replace('/user/user_home');
      }
    } catch (error) {
      console.error('Error verificando rol:', error);
      router.replace('/user/user_home');
    }
  };

  const handleVerifyCode = async (code: string) => {
    try {
      if (!confirmResult) {
        Alert.alert('Error', 'No hay confirmación pendiente.');
        return;
      }

      await AuthService.verifyCodeAndSignIn(confirmResult, code);
      setShowModal(false);
      setConfirmResult(null);
      
      // Esperar un poco para que el contexto de autenticación se actualice
      console.log('[Login] handleVerifyCode - esperando actualización del contexto...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar si ya se navegó desde el useEffect
      if (hasNavigatedRef.current) {
        console.log('[Login] handleVerifyCode - Ya se navegó desde useEffect, no navegando de nuevo');
        return;
      }
      
      // Obtener el UID del usuario autenticado después de la actualización
      const uid = user?.uid;
      console.log('[Login] handleVerifyCode - UID después de esperar:', uid);
      
      if (uid) {
        await handleVerificationSuccess(uid);
      } else {
        console.log('[Login] handleVerifyCode - No hay UID, navegando por defecto a user_home');
        // Si aún no hay usuario, ir a home de usuario
        router.replace('/user/user_home');
      }
      
    } catch (error: any) {
      console.error('Error verificando código:', error);
      Alert.alert('Error', error.message || 'Código inválido.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
      /> */}
      <Text style={styles.title}>Iniciar Sesión</Text>
      <CustomPhoneInput
        ref={phoneInput}
        defaultValue={phoneNumber}
        defaultCode="SV"
        onChangeFormattedText={(text: string) => setPhoneNumber(text)}
        containerStyle={styles.phoneContainer}
        textContainerStyle={styles.textInput}
        textInputProps={{
          placeholderTextColor: '#A3A3A3',
          style: { color: '#18181B' },
        }}
        codeTextStyle={{ color: '#18181B' }}
      />
      <TouchableOpacity style={styles.button} onPress={handleSendCode}>
        <Text style={styles.buttonText}>Enviar código de verificación</Text>
      </TouchableOpacity>
      <GoogleSignInButton onAuthComplete={handleGoogleAuthComplete} />
      
      <TouchableOpacity 
        style={styles.recoverButton} 
        onPress={() => router.push('/recover-account')}
      >
        <Text style={styles.recoverButtonText}>¿Olvidaste tu cuenta?</Text>
      </TouchableOpacity>
      
      <ModalVerificacion
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          setConfirmResult(null);
        }}
        onVerify={handleVerifyCode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 32,
  },
  phoneContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  flagButton: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropDownImage: {
    width: 12,
    height: 12,
    marginLeft: 5,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 16,
    color: '#18181B',
    marginRight: 5,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#18181B',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  googleButtonText: {
    color: '#2563EB',
    fontWeight: 'bold',
    fontSize: 16,
  },
  recoverButton: {
    marginTop: 16,
    padding: 8,
  },
  recoverButtonText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
