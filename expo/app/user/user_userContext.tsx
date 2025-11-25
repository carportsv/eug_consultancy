import { supabase } from '@/services/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type UserData = {
  name: string;
  phone: string;
  email: string;
  home: string;
  work: string;
  setUserData: (data: Partial<UserData>) => void;
};

const UserContext = createContext<UserData | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [userData, setUserDataState] = useState({
    name: '',
    phone: '',
    email: '',
    home: '',
    work: '',
  });

  const subscriptionRef = useRef<any>(undefined);

  // Obtener datos reales del usuario desde Supabase
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userId = await AsyncStorage.getItem('userUID');
        if (!userId) {
          console.log('[UserContext] No hay userId almacenado');
          return;
        }
        
        console.log('[UserContext] Cargando datos del usuario:', userId);
        
        // Cargar datos iniciales
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('firebase_uid', userId)
          .single();

        if (error) {
          console.error('[UserContext] Error al cargar datos del usuario:', error);
          return;
        }

        if (userData) {
          console.log('[UserContext] Datos del usuario obtenidos:', userData);
          setUserDataState({
            name: userData.display_name || '',
            phone: userData.phone_number || '',
            email: userData.email || '',
            home: '',
            work: '',
          });

          // Cargar configuraciones del usuario
          const { data: settingsData } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userData.id)
            .single();

          if (settingsData) {
            setUserDataState(prev => ({
              ...prev,
              home: settingsData.home_address?.address || '',
              work: settingsData.work_address?.address || '',
            }));
          }
        } else {
          console.log('[UserContext] No se encontró el usuario');
          setUserDataState({
            name: '',
            phone: '',
            email: '',
            home: '',
            work: '',
          });
        }

        // Suscribirse a cambios en tiempo real
        subscriptionRef.current = supabase
          .channel(`user_${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'users',
              filter: `firebase_uid=eq.${userId}`
            },
            (payload) => {
              console.log('[UserContext] Cambio detectado en usuario:', payload);
              if (payload.new && typeof payload.new === 'object') {
                const newData = payload.new as any;
                setUserDataState(prev => ({
                  ...prev,
                  name: newData.display_name || prev.name,
                  phone: newData.phone_number || prev.phone,
                  email: newData.email || prev.email,
                }));
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_settings',
              filter: `user_id=eq.${userData?.id}`
            },
            (payload) => {
              console.log('[UserContext] Cambio detectado en configuraciones:', payload);
              if (payload.new && typeof payload.new === 'object') {
                const newData = payload.new as any;
                setUserDataState(prev => ({
                  ...prev,
                  home: newData.home_address?.address || prev.home,
                  work: newData.work_address?.address || prev.work,
                }));
              }
            }
          )
          .subscribe();

      } catch (error) {
        console.error('[UserContext] Error al cargar datos del usuario:', error);
      }
    };
    
    loadUserData();
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  const setUserData = (data: Partial<UserData>) => {
    setUserDataState((prev) => ({ ...prev, ...data }));
  };

  return (
    <UserContext.Provider value={{ ...userData, setUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser debe usarse dentro de UserProvider');
  return ctx;
};

// Componente por defecto para la ruta
export default function UserContextPage() {
  return null; // Esta página no se usa directamente
} 