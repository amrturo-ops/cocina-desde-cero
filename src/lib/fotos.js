// Reduce la foto en el móvil antes de guardarla: menos datos y menos espacio en el servidor.
function cargarImagen(archivo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => resolver({ img, url });
    img.onerror = () => rechazar(new Error('No se ha podido leer la foto. Prueba con otra.'));
    img.src = url;
  });
}

function dibujar(img, lado) {
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(img.width * escala);
  lienzo.height = Math.round(img.height * escala);
  lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
  return lienzo;
}

// Devuelve { archivo: Blob (para el servidor, ~1280 px), miniatura: dataURL (~360 px) }
export async function prepararFoto(archivo) {
  const { img, url } = await cargarImagen(archivo);
  try {
    const grande = dibujar(img, 1280);
    const blob = await new Promise((r) => grande.toBlob(r, 'image/webp', 0.8));
    const miniatura = dibujar(img, 360).toDataURL('image/webp', 0.7);
    return { archivo: blob, miniatura };
  } finally {
    URL.revokeObjectURL(url);
  }
}
