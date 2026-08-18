
import { useState } from 'react';
import { Chip } from '@/components/ui/Chip';

export function IngredientChipInput({
  ingredients,
  onChange,
  suggestions = []
}: {
  ingredients: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');

  function commitDraft() {
    const value = draft.trim();
    if (!value) return;
    if (!ingredients.some((i) => i.toLowerCase() === value.toLowerCase())) {
      onChange([...ingredients, value]);
    }
    setDraft('');
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ingredients.map((ing) => (
          <Chip key={ing} onRemove={() => onChange(ingredients.filter((i) => i !== ing))}>
            {ing}
          </Chip>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commitDraft();
            }
          }}
          onBlur={commitDraft}
          placeholder={ingredients.length === 0 ? 'Ej. pollo, patatas, cebolla…' : 'Añadir otro…'}
          className="flex-1 min-w-[140px] bg-transparent outline-none text-sm py-1.5 placeholder:text-ink/35"
        />
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !ingredients.includes(s))
            .slice(0, 8)
            .map((s) => (
              <Chip key={s} onClick={() => onChange([...ingredients, s])}>
                + {s}
              </Chip>
            ))}
        </div>
      )}
    </div>
  );
}
