// Edge Function: verify-checkout-session
// Verifica el estado de una Checkout Session y actualiza el viaje en Supabase
// Se llama cuando el usuario regresa de Stripe Checkout

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { session_id } = await req.json()

    // Validar parámetros requeridos
    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener Checkout Session de Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent'],
    })

    console.log(`🔍 Verificando Checkout Session: ${session.id}`)
    console.log(`Estado del pago: ${session.payment_status}`)

    // Verificar estado del pago
    if (session.payment_status === 'paid') {
      // Pago exitoso
      const paymentIntentId = session.payment_intent
      const rideId = session.metadata?.ride_id

      if (!rideId) {
        return new Response(
          JSON.stringify({ error: 'ride_id no encontrado en metadata' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Actualizar viaje en Supabase
      // Obtener credenciales de Supabase del header o variables de entorno
      const authHeader = req.headers.get('Authorization')
      const supabaseUrl = req.headers.get('x-supabase-url') || Deno.env.get('SUPABASE_URL') || ''
      const supabaseAnonKey = req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || ''

      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: authHeader ? { Authorization: authHeader } : {},
          },
        })

        const { error: updateError } = await supabase
          .from('ride_requests')
          .update({
            payment_intent_id: typeof paymentIntentId === 'string' ? paymentIntentId : paymentIntentId?.id,
            payment_status: 'paid', // Con captura automática, el pago ya está pagado
            updated_at: new Date().toISOString(),
          })
          .eq('id', rideId)

        if (updateError) {
          console.error('⚠️ Error actualizando viaje en Supabase:', updateError)
          // No fallar si no se puede actualizar, el pago ya fue procesado
        } else {
          console.log(`✅ Viaje ${rideId} actualizado con payment_intent_id: ${paymentIntentId}`)
        }
      } else {
        console.warn('⚠️ No se pudieron obtener credenciales de Supabase para actualizar el viaje')
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_status: 'paid',
          payment_intent_id: typeof paymentIntentId === 'string' ? paymentIntentId : paymentIntentId?.id,
          ride_id: rideId,
          amount: session.amount_total,
          currency: session.currency,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Pago no completado o cancelado
      return new Response(
        JSON.stringify({
          success: false,
          payment_status: session.payment_status,
          ride_id: session.metadata?.ride_id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error: any) {
    console.error('❌ Error verificando Checkout Session:', error)
    
    // Extraer mensaje de error de Stripe
    let errorMessage = 'Error al verificar la sesión de pago'
    if (error.message) {
      errorMessage = error.message
    } else if (error.type) {
      errorMessage = `Error de Stripe: ${error.type}`
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error.toString(),
        code: error.code || null,
        type: error.type || null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

