import { useState } from 'react';
import Boton from '../components/Boton.jsx';
import Cabecera from '../components/Cabecera.jsx';
import { DIETAS, separarDietas } from '../lib/diets.js';
import { modoPrueba } from '../lib/supabase.js';
import { borrarCuenta } from '../lib/cuenta.js';
import { cerrarSesion } from '../hooks/useSesion.js';
import { ir } from '../hooks/useRuta.js';

export default function Perfil({ usuario, perfil, onEditar }) {
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState('');
  const { dietas, alergias } = separarDietas(perfil.dietas);

  async function borrar() {
    setBorrando(true);
    setError('');
    try {
      await borrarCuenta(usuario);
      window.location.hash = '';
      window.location.reload();
    } catch (e) {
      setError(e.message);
      setBorrando(false);
    }
  }

  return (
    <main className="pantalla">
      <Cabecera />
      <div className="pantalla__cuerpo">
        <h1>Tus datos</h1>
        <ul className="resumen">
          <li><span className="resumen__dato">Dieta</span>
            <span className="resumen__valor">{(dietas.length ? dietas : ['estandar']).map((d) => DIETAS[d].nombre).join(' + ')}</span></li>
          <li><span className="resumen__dato">Alergias</span>
            <span className="resumen__valor">{alergias.length ? alergias.map((a) => DIETAS[a].nombre).join(', ') : 'Ninguna'}</span></li>
          <li><span className="resumen__dato">Comensales</span>
            <span className="resumen__valor">{perfil.comensales}</span></li>
          <li><span className="resumen__dato">Planificas</span>
            <span className="resumen__valor">{perfil.comidas.map((c) => (c === 'comida' ? 'Comida' : 'Cena')).join(' y ')}</span></li>
        </ul>
        <Boton variante="secundario" onClick={onEditar}>Cambiar mis datos</Boton>
        <Boton variante="texto" onClick={() => ir('#privacidad')}>Política de privacidad</Boton>

        <section className="zona-peligro">
          <h2>{modoPrueba ? 'Empezar de cero' : 'Borrar mi cuenta'}</h2>
          {!confirmando ? (
            <>
              <p className="ayuda">
                {modoPrueba
                  ? 'Borra todos los datos de prueba de este navegador.'
                  : 'Se borrarán para siempre tu perfil, tu progreso, tus planes, tus fotos y tus recetas.'}
              </p>
              <Boton variante="secundario" onClick={() => setConfirmando(true)}>{modoPrueba ? 'Borrar datos de prueba' : 'Borrar mi cuenta'}</Boton>
            </>
          ) : (
            <>
              <p><strong>¿Seguro? No se puede deshacer.</strong></p>
              <div className="fila-botones">
                <Boton variante="secundario" onClick={() => setConfirmando(false)} disabled={borrando}>Cancelar</Boton>
                <Boton className="boton--peligro" onClick={borrar} disabled={borrando}>{borrando ? 'Borrando…' : 'Sí, borrar todo'}</Boton>
              </div>
            </>
          )}
          {error && <p className="error" role="alert">{error}</p>}
        </section>

        {!modoPrueba && <Boton variante="texto" onClick={cerrarSesion}>Cerrar sesión</Boton>}
      </div>
    </main>
  );
}
