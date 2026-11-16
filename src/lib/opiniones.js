// Opiniones sobre las recetas: sirven para corregir cantidades, tiempos y pasos que no se entienden.
import { supabase, modoPrueba } from './supabase.js';

export async function enviarOpinion(usuario, recetaId, valoracion, comentario) {
  const fila = { receta_id: recetaId, valoracion, comentario: comentario.trim().slice(0, 500) || null };
  if (modoPrueba) {
    const todas = JSON.parse(localStorage.getItem('cocina-opiniones-prueba') || '[]');
    localStorage.setItem('cocina-opiniones-prueba', JSON.stringify([{ ...fila, creado: new Date().toISOString() }, ...todas]));
    return;
  }
  const { error } = await supabase.from('recipe_feedback').insert({ user_id: usuario.id, ...fila });
  if (error) throw new Error('No se ha podido enviar. Gracias igualmente.');
}
