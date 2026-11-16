import { volver } from '../hooks/useRuta.js';

export default function Cabecera({ children }) {
  return (
    <div className="cabecera">
      <button type="button" className="volver" onClick={volver} aria-label="Volver">←</button>
      {children}
    </div>
  );
}
