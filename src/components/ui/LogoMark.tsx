/**
 * La marca real de Chefryer (gorro de chef + hoja + burbuja "IA"), recortada
 * y con el fondo blanco convertido a transparente a partir del logo
 * proporcionado. El mismo archivo alimenta también el favicon y los iconos
 * de instalación (public/icons/) — si se actualiza el logo, hay que
 * regenerar esos archivos a la vez (ver ARCHITECTURE.md).
 */
export function LogoMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}icons/icon-512.png`}
      alt=""
      aria-hidden="true"
      className={`${className} object-contain`}
      draggable={false}
    />
  );
}
