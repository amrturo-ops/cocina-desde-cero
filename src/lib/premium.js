// Compra de Premium con un enlace de pago de Stripe.
// El enlace lleva el id del usuario (client_reference_id) para que el webhook de Supabase
// sepa a quién activar Premium cuando Stripe confirme el pago.
import { modoPrueba } from './supabase.js';

const ENLACE = import.meta.env.VITE_ENLACE_PAGO;
const CLAVE_PRUEBA = 'cocina-premium-prueba';

// La compra simulada solo existe en la versión de prueba (npm run build:prueba), nunca en la publicada.
export const simulacion = import.meta.env.MODE === 'prueba';

// Cobrar de verdad necesita Supabase (para el webhook) y el enlace de Stripe.
export const pagoDisponible = () => simulacion || (!modoPrueba && Boolean(ENLACE));

export function esPremium(perfil) {
  if (modoPrueba) {
    if (!simulacion) return false;
    try { return localStorage.getItem(CLAVE_PRUEBA) === '1'; } catch { return false; }
  }
  return perfil?.plan === 'premium';
}

export function urlDePago(usuario) {
  if (!ENLACE) return null;
  const url = new URL(ENLACE);
  url.searchParams.set('client_reference_id', usuario.id);
  if (usuario.email) url.searchParams.set('prefilled_email', usuario.email);
  return url.toString();
}

// Solo en modo prueba: simula la compra para poder probar la app
export function simularCompra(activar = true) {
  try { activar ? localStorage.setItem(CLAVE_PRUEBA, '1') : localStorage.removeItem(CLAVE_PRUEBA); } catch { /* nada */ }
}
