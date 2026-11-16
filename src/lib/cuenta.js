// Borrar la cuenta y todos sus datos (derecho de supresión del RGPD).
import { supabase, modoPrueba } from './supabase.js';

export async function borrarCuenta(usuario) {
  if (modoPrueba) {
    Object.keys(localStorage).filter((k) => k.startsWith('cocina-')).forEach((k) => localStorage.removeItem(k));
    return;
  }
  // 1. Fotos (el almacenamiento se borra por su propia API)
  const { data: fotos } = await supabase.storage.from('fotos').list(usuario.id, { limit: 1000 });
  if (fotos?.length) {
    const { error } = await supabase.storage.from('fotos').remove(fotos.map((f) => `${usuario.id}/${f.name}`));
    if (error) throw new Error('No se han podido borrar tus fotos. Inténtalo de nuevo.');
  }
  // 2. Usuario: al borrarlo se borran en cascada perfil, planes, recetas y progreso
  const { error } = await supabase.rpc('borrar_mi_cuenta');
  if (error) throw new Error('No se ha podido borrar la cuenta. Inténtalo de nuevo o escríbenos.');
  await supabase.auth.signOut();
}
