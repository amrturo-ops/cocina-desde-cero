// Leer y guardar el perfil del usuario, en Supabase o en modo prueba.
import { supabase, modoPrueba } from './supabase.js';
import { normalizarDietas } from './diets.js';

const CLAVE_PRUEBA = 'cocina-perfil-prueba';

export const PERFIL_VACIO = {
  nombre: '',
  dietas: ['estandar'],
  comensales: 2,
  comidas: ['comida'],
};

export async function leerPerfil(usuario) {
  if (modoPrueba) {
    try {
      const guardado = localStorage.getItem(CLAVE_PRUEBA);
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('nombre, dietas, comensales, comidas, nivel_actual, plan, acepta_privacidad, consentimiento_salud')
    .eq('id', usuario.id)
    .maybeSingle();
  if (error) throw new Error('No se ha podido cargar tu perfil. Revisa tu conexión y vuelve a intentarlo.');
  return data;
}

export async function guardarPerfil(usuario, perfil, { salud = false } = {}) {
  const ahora = new Date().toISOString();
  const limpio = {
    nombre: perfil.nombre.trim().slice(0, 30),
    dietas: normalizarDietas(perfil.dietas),
    comensales: Math.min(8, Math.max(1, perfil.comensales)),
    comidas: perfil.comidas,
    acepta_privacidad: perfil.acepta_privacidad ?? ahora,
    // Si ya no hay dieta ni alergias, el consentimiento de salud deja de hacer falta
    consentimiento_salud: salud ? perfil.consentimiento_salud ?? ahora : null,
  };
  if (modoPrueba) {
    localStorage.setItem(CLAVE_PRUEBA, JSON.stringify({ ...limpio, nivel_actual: 'novato', plan: 'free' }));
    return limpio;
  }
  const { error } = await supabase.from('profiles').upsert({ id: usuario.id, ...limpio });
  if (error) throw new Error('No se ha podido guardar tu perfil. Revisa tu conexión y vuelve a intentarlo.');
  return limpio;
}

export function borrarPerfilPrueba() {
  localStorage.removeItem(CLAVE_PRUEBA);
}

// Pasar al siguiente nivel (o volver a uno anterior)
export async function cambiarNivel(usuario, nivel) {
  if (modoPrueba) {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_PRUEBA) || '{}');
    localStorage.setItem(CLAVE_PRUEBA, JSON.stringify({ ...guardado, nivel_actual: nivel }));
    return;
  }
  const { error } = await supabase.from('profiles').update({ nivel_actual: nivel }).eq('id', usuario.id);
  if (error) throw new Error('No se ha podido cambiar de nivel. Revisa tu conexión.');
}
