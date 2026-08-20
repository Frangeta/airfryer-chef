const VARIANTS: Record<string, string> = {
  neutral: 'bg-black/[0.05] text-ink/70',
  teal: 'bg-teal-50 text-teal-600',
  gold: 'bg-gold-100 text-gold-600',
  basket1: 'bg-basket1-light text-basket1-dark',
  basket2: 'bg-basket2-light text-basket2-dark',
  warn: 'bg-warn/10 text-warn'
};

export function Badge({
  children,
  variant = 'neutral',
  className = ''
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  );
}

const DIFFICULTY_LABEL: Record<string, string> = { FACIL: 'Fácil', MEDIA: 'Media', AVANZADA: 'Avanzada' };
const DIFFICULTY_VARIANT: Record<string, keyof typeof VARIANTS> = { FACIL: 'gold', MEDIA: 'teal', AVANZADA: 'warn' };

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return <Badge variant={DIFFICULTY_VARIANT[difficulty] ?? 'neutral'}>{DIFFICULTY_LABEL[difficulty] ?? difficulty}</Badge>;
}
