// Recetas cocinadas por el usuario (en Supabase o en modo prueba).
import { supabase, modoPrueba } from './supabase.js';

const CLAVE_PRUEBA = 'cocina-completadas-prueba';

function leerPrueba() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_PRUEBA) || '[]');
  } catch {
    return [];
  }
}

export async function leerCompletadas(usuario) {
  if (modoPrueba) return leerPrueba();
  const { data, error } = await supabase
    .from('recipe_completions')
    .select('receta_id, tecnicas, foto_path, cocinado')
    .eq('user_id', usuario.id)
    .order('cocinado', { ascending: false });
  if (error) throw new Error('No se ha podido cargar tu progreso. Revisa tu conexión y vuelve a intentarlo.');
  return data;
}

/**
 * Registra una receta cocinada.
 * @param foto  null o { archivo: Blob, miniatura: dataURL } (de prepararFoto)
 */
export async function registrarCocinado(usuario, receta, foto = null) {
  const fila = { receta_id: receta.id, tecnicas: receta.tecnicas, foto_path: null, cocinado: new Date().toISOString() };

  if (modoPrueba) {
    // En modo prueba guardamos solo la miniatura: el navegador tiene poco espacio
    fila.foto_path = foto?.miniatura ?? null;
    try {
      localStorage.setItem(CLAVE_PRUEBA, JSON.stringify([fila, ...leerPrueba()]));
    } catch {
      fila.foto_path = null; // sin espacio: se guarda sin foto
      localStorage.setItem(CLAVE_PRUEBA, JSON.stringify([fila, ...leerPrueba()]));
    }
    return fila;
  }

  if (foto?.archivo) {
    const ruta = `${usuario.id}/${Date.now()}.webp`;
    const { error } = await supabase.storage.from('fotos').upload(ruta, foto.archivo, { contentType: 'image/webp' });
    if (error) throw new Error('No se ha podido subir la foto. Revisa tu conexión y vuelve a intentarlo.');
    fila.foto_path = ruta;
  }
  const { error } = await supabase.from('recipe_completions').insert({ user_id: usuario.id, ...fila });
  if (error) throw new Error('No se ha podido guardar. Revisa tu conexión y vuelve a intentarlo.');
  return fila;
}

// Direcciones para mostrar las fotos (en Supabase son privadas: se piden enlaces temporales)
export async function urlsDeFotos(filas) {
  const conFoto = filas.filter((f) => f.foto_path);
  if (modoPrueba) return new Map(conFoto.map((f) => [f.foto_path, f.foto_path]));
  if (!conFoto.length) return new Map();
  const { data, error } = await supabase.storage.from('fotos').createSignedUrls(conFoto.map((f) => f.foto_path), 3600);
  if (error) return new Map();
  return new Map(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

export function borrarCompletadasPrueba() {
  localStorage.removeItem(CLAVE_PRUEBA);
}
