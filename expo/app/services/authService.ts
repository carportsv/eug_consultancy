import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthInstanceAsync } from './firebaseConfig';
import { supabase } from './supabaseClient';
import { getUserRoleFromSupabase } from './userFirestore';

export interface UserSession {
  uid: string;
  role: string;
  phoneNumber: string;
  name?: string;
  email?: string;
}

export class AuthService {
  // Enviar código de verificación
  static async sendVerificationCode(phoneNumber: string) {
    try {
      console.log('AuthService: Enviando código a:', phoneNumber);
      const confirmation = await (await getAuthInstanceAsync()).signInWithPhoneNumber(phoneNumber);
      console.log('AuthService: Código enviado exitosamente');
      return confirmation;
    } catch (error) {
      console.error('AuthService: Error enviando código:', error);
      throw error;
    }
  }

  // Verificar código y autenticar usuario
  static async verifyCodeAndSignIn(confirmation: any, code: string) {
    try {
      console.log('AuthService: Verificando código...');
      const result = await confirmation.confirm(code);
      console.log('AuthService: Código verificado exitosamente');
      return result.user;
    } catch (error) {
      console.error('AuthService: Error verificando código:', error);
      throw error;
    }
  }

  // Guardar sesión del usuario
  static async saveUserSession(user: any, phoneNumber: string) {
    try {
      console.log('AuthService: Guardando sesión para usuario:', user.uid);
      
      // Intentar obtener rol existente o crear usuario en Supabase
      let role = 'user'; // Valor por defecto
      try {
        role = await getUserRoleFromSupabase(user.uid) || 'user';
      } catch (roleError) {
        console.warn('AuthService: Usuario no encontrado en Supabase, sincronizando...');
        // Sincronizar usuario con Supabase automáticamente
        try {
          const syncResult = await syncUserWithSupabase(user);
          if (syncResult) {
            console.log('AuthService: Usuario sincronizado con Supabase exitosamente');
            // Intentar obtener el rol nuevamente después de la sincronización
            role = await getUserRoleFromSupabase(user.uid) || 'user';
          } else {
            console.warn('AuthService: Error sincronizando con Supabase');
          }
        } catch (syncError) {
          console.error('AuthService: Error sincronizando usuario:', syncError);
          // Continuar con rol por defecto
        }
      }
      
      const session: UserSession = {
        uid: user.uid,
        role: role,
        phoneNumber: phoneNumber,
        name: user.displayName || '',
        email: user.email || ''
      };
      await AsyncStorage.setItem('userSession', JSON.stringify(session));
      await AsyncStorage.setItem('userUID', user.uid);
      await AsyncStorage.setItem('userRole', session.role);
      console.log('AuthService: Sesión guardada exitosamente');
      return session;
    } catch (error) {
      console.error('AuthService: Error guardando sesión:', error);
      throw error;
    }
  }

  // Obtener sesión actual del usuario
  static async getCurrentSession(): Promise<UserSession | null> {
    try {
      const sessionData = await AsyncStorage.getItem('userSession');
      if (sessionData) {
        const session: UserSession = JSON.parse(sessionData);
        console.log('AuthService: Sesión recuperada:', session.uid);
        return session;
      }
      return null;
    } catch (error) {
      console.error('AuthService: Error obteniendo sesión:', error);
      return null;
    }
  }

  // Verificar si el usuario está autenticado
  static async isAuthenticated(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      const currentUser = (await getAuthInstanceAsync()).currentUser;
      return !!(session && currentUser);
    } catch (error) {
      console.error('AuthService: Error verificando autenticación:', error);
      return false;
    }
  }

  // Cerrar sesión
  static async signOut() {
    try {
      console.log('AuthService: Cerrando sesión...');
      
      // Verificar si hay usuario autenticado en Firebase antes de intentar cerrar sesión
      const auth = await getAuthInstanceAsync();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        console.log('AuthService: Usuario encontrado en Firebase, cerrando sesión...');
        await auth.signOut();
        console.log('AuthService: Sesión de Firebase cerrada exitosamente');
      } else {
        console.log('AuthService: No hay usuario autenticado en Firebase, limpiando solo datos locales');
      }
      
      // Siempre limpiar datos locales, independientemente del estado de Firebase
      await AsyncStorage.removeItem('userSession');
      await AsyncStorage.removeItem('userUID');
      await AsyncStorage.removeItem('userRole');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('userNick');
      await AsyncStorage.removeItem('userToken');
      
      console.log('AuthService: Sesión cerrada exitosamente');
    } catch (error) {
      console.error('AuthService: Error cerrando sesión:', error);
      
      // Aunque haya error en Firebase, limpiar datos locales
      try {
        await AsyncStorage.removeItem('userSession');
        await AsyncStorage.removeItem('userUID');
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userData');
        await AsyncStorage.removeItem('userNick');
        await AsyncStorage.removeItem('userToken');
        console.log('AuthService: Datos locales limpiados después del error');
      } catch (localError) {
        console.error('AuthService: Error limpiando datos locales:', localError);
      }
      
      // No lanzar el error para evitar que la app se rompa
      console.log('AuthService: Sesión cerrada (con errores menores)');
    }
  }

  // Crear o actualizar perfil de usuario
  static async createOrUpdateUserProfile(userData: {
    uid: string;
    name: string;
    phoneNumber: string;
    role: string;
    email?: string;
  }) {
    try {
      console.log('AuthService: Creando/actualizando perfil para:', userData.uid);
      
      // Buscar usuario existente por firebase_uid
      const { data: existingUser, error: searchError } = await supabase
        .from('users')
        .select('*')
        .eq('firebase_uid', userData.uid)
        .single();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('AuthService: Error buscando usuario:', searchError);
        throw searchError;
      }

      const userProfile = {
        firebase_uid: userData.uid,
        email: userData.email,
        display_name: userData.name,
        phone_number: userData.phoneNumber,
        role: userData.role,
        is_active: true
      };

      if (existingUser) {
        // Actualizar usuario existente pero preservar el rol si ya existe
        const updateProfile = {
          ...userProfile,
          role: existingUser.role // Preservar el rol existente
        };
        
        const { error: updateError } = await supabase
          .from('users')
          .update(updateProfile)
          .eq('firebase_uid', userData.uid);

        if (updateError) {
          console.error('AuthService: Error actualizando usuario:', updateError);
          throw updateError;
        }
        console.log('AuthService: Usuario actualizado exitosamente (rol preservado)');
      } else {
        // Crear nuevo usuario
        const { error: insertError } = await supabase
          .from('users')
          .insert([userProfile]);

        if (insertError) {
          console.error('AuthService: Error creando usuario:', insertError);
          throw insertError;
        }
        console.log('AuthService: Usuario creado exitosamente');
      }

      const session: UserSession = {
        uid: userData.uid,
        role: userData.role,
        phoneNumber: userData.phoneNumber,
        name: userData.name,
        email: userData.email
      };
      await AsyncStorage.setItem('userSession', JSON.stringify(session));
      console.log('AuthService: Perfil creado/actualizado exitosamente');
      return session;
    } catch (error) {
      console.error('AuthService: Error creando/actualizando perfil:', error);
      throw error;
    }
  }

  // Recuperar cuenta por email
  static async recoverAccountByEmail(email: string) {
    try {
      console.log('AuthService: Iniciando recuperación por email:', email);
      await (await getAuthInstanceAsync()).sendPasswordResetEmail(email);
      console.log('AuthService: Email de recuperación enviado');
      return true;
    } catch (error) {
      console.error('AuthService: Error enviando email de recuperación:', error);
      throw error;
    }
  }

  // Verificar si un email existe en la base de datos
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      console.log('AuthService: Verificando si email existe:', email);
      const { getUserByEmail } = await import('./userFirestore');
      const user = await getUserByEmail(email);
      return !!user;
    } catch (error) {
      console.error('AuthService: Error verificando email:', error);
      return false;
    }
  }

  // Actualizar email del usuario
  static async updateUserEmail(uid: string, newEmail: string) {
    try {
      console.log('AuthService: Actualizando email para:', uid);
      const { updateUserData } = await import('./userFirestore');
      await updateUserData(uid, {
        email: newEmail,
        updated_at: new Date().toISOString()
      });
      const session = await this.getCurrentSession();
      if (session) {
        session.email = newEmail;
        await AsyncStorage.setItem('userSession', JSON.stringify(session));
      }
      console.log('AuthService: Email actualizado exitosamente');
      return true;
    } catch (error) {
      console.error('AuthService: Error actualizando email:', error);
      throw error;
    }
  }

  // Obtener estadísticas de autenticación
  static async getAuthStats() {
    try {
      const currentUser = (await getAuthInstanceAsync()).currentUser;
      const session = await this.getCurrentSession();
      return {
        isAuthenticated: !!currentUser,
        hasSession: !!session,
        currentUser: currentUser ? {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          phoneNumber: currentUser.phoneNumber
        } : null,
        session: session
      };
    } catch (error) {
      console.error('AuthService: Error obteniendo estadísticas:', error);
      return {
        isAuthenticated: false,
        hasSession: false,
        currentUser: null,
        session: null
      };
    }
  }
}

// Función para sincronizar usuario de Firebase Auth con Supabase
export const syncUserWithSupabase = async (firebaseUser: any) => {
  try {
    if (!firebaseUser) {
      console.warn('No hay usuario de Firebase para sincronizar');
      return false;
    }

    const { uid, email, displayName, phoneNumber, photoURL } = firebaseUser;
    console.log('🔄 Sincronizando usuario:', { uid, email, displayName, phoneNumber });

    // Verificar si el usuario ya existe en Supabase por firebase_uid
    console.log('🔍 Verificando si usuario existe por firebase_uid:', uid);
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, firebase_uid')
      .eq('firebase_uid', uid)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        console.log('✅ Usuario no existe por firebase_uid, procediendo a crear...');
      } else {
        console.error('❌ Error al verificar usuario existente:', checkError);
        return false;
      }
    } else {
      console.log('✅ Usuario ya existe en Supabase por firebase_uid:', uid);
      
      // Actualizar datos del usuario si es necesario
      const updateData: any = {
        display_name: displayName || '',
        phone_number: phoneNumber || '',
        photo_url: photoURL || '',
        updated_at: new Date().toISOString()
      };
      
      // Solo actualizar email si no es null y es diferente al existente
      if (email && email !== existingUser.email) {
        updateData.email = email;
      }

      console.log('🔄 Actualizando usuario existente con datos:', updateData);
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('firebase_uid', uid);

      if (updateError) {
        console.error('❌ Error actualizando usuario en Supabase:', updateError);
        return false;
      }

      console.log('✅ Usuario actualizado en Supabase:', uid);
      return true;
    }

    // Si no existe por firebase_uid, verificar si existe por email (solo si hay email)
    if (email) {
      console.log('🔍 Verificando si usuario existe por email:', email);
      const { data: existingByEmail, error: emailCheckError } = await supabase
        .from('users')
        .select('id, firebase_uid')
        .eq('email', email)
        .single();

      if (emailCheckError) {
        if (emailCheckError.code === 'PGRST116') {
          console.log('✅ Usuario no existe por email, procediendo a crear...');
        } else {
          console.error('❌ Error verificando usuario por email:', emailCheckError);
          return false;
        }
      } else {
        console.log('✅ Usuario existe por email, actualizando firebase_uid:', email);
        
        // Actualizar el firebase_uid del usuario existente
        const { error: updateError } = await supabase
          .from('users')
          .update({
            firebase_uid: uid,
            display_name: displayName || '',
            phone_number: phoneNumber || '',
            photo_url: photoURL || '',
            updated_at: new Date().toISOString()
          })
          .eq('email', email);

        if (updateError) {
          console.error('❌ Error actualizando firebase_uid:', updateError);
          return false;
        }

        console.log('✅ firebase_uid actualizado para usuario existente:', email);
        return true;
      }
    }

    // Crear nuevo usuario en Supabase
    console.log('🆕 Creando nuevo usuario en Supabase...');
    const userData: any = {
      firebase_uid: uid,
      display_name: displayName || '',
      phone_number: phoneNumber || '',
      photo_url: photoURL || '',
      role: 'user', // rol por defecto
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Solo incluir email si no es null
    if (email) {
      userData.email = email;
    }

    console.log('📝 Datos del usuario a crear:', userData);
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error al crear usuario en Supabase:', insertError);
      
      // Si es error de duplicado de email, intentar actualizar
      if (insertError.code === '23505' && insertError.message.includes('email') && email) {
        console.log('🔄 Email duplicado, intentando actualizar usuario existente...');
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            firebase_uid: uid,
            display_name: displayName || '',
            phone_number: phoneNumber || '',
            photo_url: photoURL || '',
            updated_at: new Date().toISOString()
          })
          .eq('email', email);

        if (updateError) {
          console.error('❌ Error actualizando usuario duplicado:', updateError);
          return false;
        }

        console.log('✅ Usuario duplicado actualizado exitosamente:', email);
        return true;
      }
      
      return false;
    }

    console.log('✅ Usuario creado exitosamente en Supabase:', newUser);
    return true;
  } catch (error) {
    console.error('❌ Error en sincronización de usuario:', error);
    return false;
  }
};

// Función para obtener o crear usuario en Supabase
export const getOrCreateSupabaseUser = async (firebaseUser: any) => {
  try {
    if (!firebaseUser) return null;

    // Intentar sincronizar primero
    await syncUserWithSupabase(firebaseUser);

    // Obtener datos del usuario desde Supabase
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', firebaseUser.uid)
      .single();

    if (error) {
      console.error('Error al obtener usuario de Supabase:', error);
      return null;
    }

    return userData;
  } catch (error) {
    console.error('Error en getOrCreateSupabaseUser:', error);
    return null;
  }
}; 