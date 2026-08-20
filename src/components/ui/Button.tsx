import { forwardRef } from 'react';

type Variant = 'primary' | 'warm' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-teal-500 hover:bg-teal-600 text-white shadow-card',
  // Cálido a propósito: reservado para los botones que ponen la IA en
  // marcha (generar, convertir) — el contraste cálido frente al resto de la
  // app en verde azulado es deliberado, no un descuido.
  warm: 'bg-paprika-500 hover:bg-paprika-600 text-white shadow-card',
  secondary: 'bg-black/[0.04] hover:bg-black/[0.07] text-ink',
  ghost: 'bg-transparent hover:bg-black/[0.04] text-ink/80',
  danger: 'bg-warn/10 hover:bg-warn/20 text-warn'
};

const SIZES: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2.5 rounded-xl gap-2'
};

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
