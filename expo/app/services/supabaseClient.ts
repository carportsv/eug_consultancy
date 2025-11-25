import { createClient } from '@supabase/supabase-js';

// Reemplaza estos valores con los de tu proyecto Supabase
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Verificar que las variables estén configuradas
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Variables de Supabase no configuradas:', {
    SUPABASE_URL: SUPABASE_URL ? 'Configurada' : 'No configurada',
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? 'Configurada' : 'No configurada'
  });
}

// Configuración mejorada con timeouts y reintentos
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'X-Client-Info': 'taxi-zkt-app'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig);

// Función de prueba de conexión con timeout
export async function testSupabaseConnection(timeoutMs: number = 10000): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log('🔄 Probando conexión a Supabase...');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error) {
      console.error('❌ Error de conexión a Supabase:', error.message);
      return false;
    }

    console.log('✅ Conexión a Supabase exitosa. Ejemplo de datos:', data);
    return true;
  } catch (err) {
    clearTimeout(timeoutId);
    
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        console.error('❌ Timeout al conectar con Supabase (más de 10 segundos)');
      } else if (err.message.includes('Network request failed')) {
        console.error('❌ Error de red al conectar con Supabase');
      } else {
        console.error('❌ Error inesperado al probar Supabase:', err.message);
      }
    } else {
      console.error('❌ Error desconocido al probar Supabase:', err);
    }
    
    return false;
  }
}

// Función para verificar configuración
export function checkSupabaseConfig(): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!SUPABASE_URL) {
    issues.push('EXPO_PUBLIC_SUPABASE_URL no está configurada');
  } else if (!SUPABASE_URL.includes('supabase.co')) {
    issues.push('EXPO_PUBLIC_SUPABASE_URL parece no ser una URL válida de Supabase');
  }
  
  if (!SUPABASE_ANON_KEY) {
    issues.push('EXPO_PUBLIC_SUPABASE_ANON_KEY no está configurada');
  } else if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
    issues.push('EXPO_PUBLIC_SUPABASE_ANON_KEY no parece ser una clave válida de Supabase');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
} 