export function Chip({
  children,
  onRemove,
  active,
  onClick
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  active?: boolean;
  onClick?: () => void;
}) {
  const interactive = !!onClick;
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active ? 'bg-teal-500 border-teal-500 text-white' : 'bg-paper border-black/10 text-ink/80'
      } ${interactive ? 'cursor-pointer hover:border-teal-400' : ''}`}
    >
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Quitar"
          className="opacity-60 hover:opacity-100"
        >
          ×
        </button>
      )}
    </span>
  );
}
