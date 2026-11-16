import icono from '../assets/icon.svg';
import { useState } from 'react';
import Boton from '../components/Boton.jsx';
import { supabase, urlVuelta } from '../lib/supabase.js';
import { NOMBRE_APP } from '../textos.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState('inicio'); // inicio | enviando | enviado
  const [error, setError] = useState('');

  const emailValido = /^\S+@\S+\.\S+$/.test(email.trim());

  async function enviarEnlace() {
    setError('');
    setEstado('enviando');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: urlVuelta() },
    });
    if (error) {
      setEstado('inicio');
      setError('No se ha podido enviar el enlace. Comprueba el email y vuelve a intentarlo.');
    } else {
      setEstado('enviado');
    }
  }

  async function entrarConGoogle() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: urlVuelta() },
    });
    if (error) setError('No se ha podido abrir Google. Vuelve a intentarlo o entra con tu email.');
  }

  if (estado === 'enviado') {
    return (
      <main className="pantalla">
        <div className="pantalla__cuerpo portada">
          <h1>Mira tu correo</h1>
          <p>Te hemos enviado un enlace a <strong>{email.trim()}</strong>. Ábrelo desde este móvil para entrar.</p>
          <p className="ayuda">Si no aparece en un par de minutos, revisa la carpeta de spam.</p>
        </div>
        <div className="pantalla__pie">
          <Boton variante="secundario" onClick={() => setEstado('inicio')}>Usar otro email</Boton>
        </div>
      </main>
    );
  }

  return (
    <main className="pantalla">
      <div className="pantalla__cuerpo portada">
        <img className="portada__huevo" src={icono} alt="" />
        <h1 className="portada__titulo">{NOMBRE_APP}</h1>
        <p>Entra para guardar tu progreso. Sin contraseñas: te mandamos un enlace.</p>
        <label htmlFor="email" className="ayuda">Tu email</label>
        <input id="email" className="campo" type="email" inputMode="email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@ejemplo.com" />
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <div className="pantalla__pie">
        <Boton onClick={enviarEnlace} disabled={!emailValido || estado === 'enviando'}>
          {estado === 'enviando' ? 'Enviando…' : 'Enviarme el enlace'}
        </Boton>
        <Boton variante="secundario" onClick={entrarConGoogle}>Entrar con Google</Boton>
      </div>
    </main>
  );
}
