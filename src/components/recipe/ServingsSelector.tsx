
const OPTIONS = [1, 2, 3, 4, 5, 6, 8];

export function ServingsSelector({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-sm text-ink/60 mr-1">Personas:</span>
      {OPTIONS.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
            value === n ? 'bg-teal-500 text-white' : 'bg-black/[0.05] text-ink/70 hover:bg-black/[0.09]'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
