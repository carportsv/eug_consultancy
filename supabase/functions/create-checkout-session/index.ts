// Edge Function: create-checkout-session
// Crea una Checkout Session en Stripe para procesar pagos
// El usuario será redirigido a Stripe para completar el pago
// NO requiere "Raw Card Data APIs" porque Stripe maneja los datos

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"

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
    const {
      ride_id,
      amount,
      currency = 'usd',
      origin_address,
      destination_address,
      client_email,
      client_name,
      success_url,
      cancel_url,
    } = await req.json()

    // Validar parámetros requeridos
    if (!ride_id) {
      return new Response(
        JSON.stringify({ error: 'ride_id es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'amount debe ser mayor a 0' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar URLs de retorno
    if (!success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: 'success_url y cancel_url son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear descripción del viaje
    const description = origin_address && destination_address
      ? `Viaje de Taxi: ${origin_address} → ${destination_address}`
      : 'Viaje de Taxi'

    // Crear Checkout Session en Stripe
    // capture_method: 'manual' significa que solo se autoriza, no se cobra
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: 'Viaje de Taxi',
              description: description,
            },
            unit_amount: Math.round(amount * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: {
        ride_id: ride_id,
        type: 'ride_payment',
      },
      // Configurar metadata del Payment Intent
      // NOTA: capture_method: 'manual' causa errores 402 en algunas cuentas de Stripe
      // Por ahora, dejamos que Stripe capture automáticamente
      // Si necesitas captura manual, puedes implementarlo usando Payment Intents directamente
      payment_intent_data: {
        metadata: {
          ride_id: ride_id,
          type: 'ride_payment',
        },
      },
      // Información del cliente (opcional pero recomendado)
      customer_email: client_email || undefined,
      ...(client_name && {
        customer_creation: 'always',
      }),
    })

    console.log(`✅ Checkout Session creada: ${session.id} para ride: ${ride_id}`)
    console.log(`URL de Checkout: ${session.url}`)

    return new Response(
      JSON.stringify({
        session_id: session.id,
        checkout_url: session.url,
        payment_intent_id: session.payment_intent,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Error creando Checkout Session:', error)
    
    // Extraer mensaje de error de Stripe
    let errorMessage = 'Error al crear la sesión de pago'
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

