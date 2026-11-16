// Recetas creadas por los usuarios.
// - Propias: solo las ve quien las crea.
// - Compartidas: pasan a «pendiente» y, cuando las apruebas en Supabase (estado = 'aprobada'), las ve todo el mundo.
import { supabase, modoPrueba } from './supabase.js';

const CLAVE_PRUEBA = 'cocina-mis-recetas-prueba';
const leerPrueba = () => {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_PRUEBA) || '[]');
  } catch {
    return [];
  }
};

export const nuevoId = () => `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function leerRecetasUsuario(usuario) {
  if (modoPrueba) return leerPrueba().map((r) => ({ ...r, origen: 'propia', estado: 'privada' }));
  const { data, error } = await supabase.from('user_recipes').select('id, user_id, receta, estado, autor');
  if (error) throw new Error('No se han podido cargar las recetas de la comunidad.');
  return data.map((f) => ({
    ...f.receta,
    id: f.id,
    autor: f.autor,
    estado: f.estado,
    origen: f.user_id === usuario.id ? 'propia' : 'comunidad',
  }));
}

export async function guardarRecetaUsuario(usuario, receta, { compartir, autor }) {
  const { origen, estado, autor: _a, ...limpia } = receta;
  if (modoPrueba) {
    const todas = leerPrueba().filter((r) => r.id !== receta.id);
    localStorage.setItem(CLAVE_PRUEBA, JSON.stringify([limpia, ...todas]));
    return { ...limpia, origen: 'propia', estado: 'privada' };
  }
  const fila = { user_id: usuario.id, receta: limpia, autor, estado: compartir ? 'pendiente' : 'privada' };
  const existe = receta.id && !receta.id.startsWith('u-');
  const { data, error } = existe
    ? await supabase.from('user_recipes').update(fila).eq('id', receta.id).select('id').single()
    : await supabase.from('user_recipes').insert(fila).select('id').single();
  if (error) throw new Error('No se ha podido guardar la receta. Revisa tu conexión y vuelve a intentarlo.');
  return { ...limpia, id: data.id, origen: 'propia', estado: fila.estado, autor };
}

export async function borrarRecetaUsuario(usuario, id) {
  if (modoPrueba) {
    localStorage.setItem(CLAVE_PRUEBA, JSON.stringify(leerPrueba().filter((r) => r.id !== id)));
    return;
  }
  const { error } = await supabase.from('user_recipes').delete().eq('id', id);
  if (error) throw new Error('No se ha podido borrar la receta.');
}

export function borrarRecetasPrueba() {
  localStorage.removeItem(CLAVE_PRUEBA);
}
