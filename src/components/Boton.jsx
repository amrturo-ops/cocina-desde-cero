export default function Boton({ variante = 'principal', className = '', ...props }) {
  return <button type="button" className={`boton boton--${variante} ${className}`} {...props} />;
}
