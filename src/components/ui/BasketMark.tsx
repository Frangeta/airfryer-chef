/**
 * La marca de la app: dos cestas superpuestas, ámbar y verde — los mismos
 * colores que usa el timeline de doble cesta en la ficha de receta. Es el
 * elemento visual que ancla la identidad de la app en más sitios (favicon,
 * navegación, pantalla de acceso).
 */
export function BasketMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="12" fill="#DDA23A" />
      <rect x="22" y="22" width="36" height="36" rx="12" fill="#3E7C63" fillOpacity="0.92" />
    </svg>
  );
}
