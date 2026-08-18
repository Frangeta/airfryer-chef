
const OPTIONS: { value: string; emoji: string; label: string }[] = [
  { value: 'LOVE', emoji: '❤️', label: 'Me encanta' },
  { value: 'LIKE', emoji: '👍', label: 'Me gusta' },
  { value: 'NEUTRAL', emoji: '😐', label: 'Normal' },
  { value: 'DISLIKE', emoji: '👎', label: 'No me gusta' }
];

export function RatingPicker({ value, onChange }: { value?: string | null; onChange: (rating: string) => void }) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-label={opt.label}
          title={opt.label}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
            value === opt.value ? 'bg-paprika-50 ring-2 ring-paprika-400 scale-110' : 'bg-black/[0.04] hover:bg-black/[0.07]'
          }`}
        >
          {opt.emoji}
        </button>
      ))}
    </div>
  );
}
