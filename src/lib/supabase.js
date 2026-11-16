import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si no hay datos de Supabase, la app funciona en «modo prueba» (todo en este navegador).
export const supabase = url && clave ? createClient(url, clave) : null;
export const modoPrueba = !supabase;

// Dirección a la que vuelve el usuario tras pulsar el enlace del email o entrar con Google
export const urlVuelta = () => window.location.origin + window.location.pathname;
