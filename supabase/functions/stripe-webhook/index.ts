// Webhook de Stripe: cuando alguien paga Premium, marca su perfil como 'premium'.
// Despliegue (ver README): supabase functions deploy stripe-webhook --no-verify-jwt
// Variables (supabase secrets set ...): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY las pone Supabase automáticamente.
import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' });
const firmaSecreta = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

Deno.serve(async (req) => {
  const firma = req.headers.get('stripe-signature');
  const cuerpo = await req.text();
  let evento: Stripe.Event;
  try {
    // Comprueba que el aviso viene de verdad de Stripe
    evento = await stripe.webhooks.constructEventAsync(cuerpo, firma ?? '', firmaSecreta, undefined, Stripe.createSubtleCryptoProvider());
  } catch (e) {
    return new Response(`Firma no válida: ${(e as Error).message}`, { status: 400 });
  }

  if (evento.type === 'checkout.session.completed' || evento.type === 'checkout.session.async_payment_succeeded') {
    const sesion = evento.data.object as Stripe.Checkout.Session;
    const userId = sesion.client_reference_id;
    if (sesion.payment_status !== 'paid' || !userId) return new Response('Sin pago confirmado o sin usuario', { status: 200 });

    // No procesar dos veces el mismo pago
    const { error: errPago } = await supabase.from('pagos').insert({
      id: sesion.id, user_id: userId, importe: sesion.amount_total, moneda: sesion.currency,
    });
    if (errPago && errPago.code !== '23505') return new Response('Error guardando el pago', { status: 500 });

    const { error } = await supabase.from('profiles').update({ plan: 'premium' }).eq('id', userId);
    if (error) return new Response('Error activando Premium', { status: 500 });
  }
  return new Response('ok', { status: 200 });
});
