import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';

type RouteGuardProps = {
  children: React.ReactNode;
  allowedUserTypes: ('user' | 'driver' | 'admin')[];
  redirectTo?: string;
};

export const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  allowedUserTypes, 
  redirectTo 
}) => {
  console.log('[RouteGuard] COMPONENTE INICIANDO');
  const { isAuthenticated, loading, userType, setUserType } = useAuth();
  const router = useRouter();

  console.log('[RouteGuard] Render:', { 
    isAuthenticated, 
    loading, 
    userType, 
    allowedUserTypes 
  });

  // Si el usuario está autenticado pero no tiene userType, establecerlo como 'user' por defecto
  useEffect(() => {
    if (isAuthenticated && !loading && !userType) {
      console.log('[RouteGuard] Usuario autenticado sin userType, estableciendo como "user"');
      setUserType('user');
    }
  }, [isAuthenticated, loading, userType, setUserType]);

  // TEMPORALMENTE DESACTIVADO PARA DEBUG - CICLO INFINITO
  useEffect(() => {
    if (!loading) {
      // Si no está autenticado, redirigir a login
      if (!isAuthenticated) {
        router.replace('/login');
        return;
      }

      // Si no tiene el tipo de usuario permitido
      if (!userType || !allowedUserTypes.includes(userType)) {
        if (redirectTo) {
          router.replace(redirectTo);
        } else {
          // Redirigir según el tipo de usuario
          switch (userType) {
            case 'driver':
              router.replace('/driver/driver_home');
              break;
            case 'user':
              router.replace('/user/user_home');
              break;
            case 'admin':
              router.replace('/admin/admin_home');
              break;
            default:
              router.replace('/user/user_home');
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, loading, userType]);

  // Mostrar loading mientras verifica
  if (loading) {
    console.log('[RouteGuard] Loading, devolviendo null');
    return null; // O un componente de loading
  }

  // Si no está autenticado o no tiene permisos, no mostrar nada
  if (!isAuthenticated || !userType || !allowedUserTypes.includes(userType)) {
    console.log('[RouteGuard] Sin permisos, devolviendo null:', { 
      isAuthenticated, 
      userType, 
      allowedUserTypes 
    });
    return null;
  }

  // Si tiene permisos, mostrar el contenido
  console.log('[RouteGuard] Permisos OK, mostrando contenido');
  return <>{children}</>;
}; 