const PESTANAS = [
  { ruta: 'inicio', icono: '🔪', texto: 'Aprender' },
  { ruta: 'recetas', icono: '📖', texto: 'Recetas' },
  { ruta: 'plan', icono: '📅', texto: 'Plan' },
  { ruta: 'lista', icono: '🛒', texto: 'Lista' },
  { ruta: 'progreso', icono: '⭐', texto: 'Progreso' },
];

export default function BarraNav({ actual }) {
  return (
    <nav className="barra-nav" aria-label="Secciones">
      {PESTANAS.map((p) => (
        <a key={p.ruta} href={`#${p.ruta}`} className="barra-nav__item" aria-current={actual === p.ruta ? 'page' : undefined}>
          <span aria-hidden="true">{p.icono}</span>
          {p.texto}
        </a>
      ))}
    </nav>
  );
}
