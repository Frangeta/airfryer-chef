import { useState } from 'react';
import { Repeat2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import * as aiClient from '@/services/aiClient';
import type { AIContext } from '@/types';

interface Substitution {
  original: string;
  substitute: string;
  category: 'EQUIVALENTE' | 'POSIBLE_CAMBIA_SABOR' | 'NO_RECOMENDABLE';
  explanation: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  EQUIVALENTE: 'Equivalente',
  POSIBLE_CAMBIA_SABOR: 'Cambia el sabor',
  NO_RECOMENDABLE: 'No recomendable'
};
const CATEGORY_VARIANT: Record<string, 'gold' | 'paprika' | 'warn'> = {
  EQUIVALENTE: 'gold',
  POSIBLE_CAMBIA_SABOR: 'paprika',
  NO_RECOMENDABLE: 'warn'
};

export function SubstitutionWidget({
  ingredientName,
  recipeContext,
  context
}: {
  ingredientName: string;
  recipeContext: string;
  context: AIContext;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Substitution[] | null>(null);

  async function handleOpen() {
    setOpen((v) => !v);
    if (results || loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await aiClient.suggestSubstitution({ missingIngredient: ingredientName, recipeContext, context });
      setResults(data.substitutions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-1">
      <button onClick={handleOpen} className="text-xs text-paprika-600 hover:underline flex items-center gap-1">
        <Repeat2 className="w-3 h-3" /> ¿No tienes {ingredientName.toLowerCase()}?
      </button>

      {open && (
        <div className="mt-2 space-y-2 bg-cream/60 rounded-xl p-3">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-ink/50">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando alternativas…
            </div>
          )}
          {error && <p className="text-xs text-warn">{error}</p>}
          {results?.map((s, i) => (
            <div key={i} className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink/80">{s.substitute}</span>
                <Badge variant={CATEGORY_VARIANT[s.category]}>{CATEGORY_LABEL[s.category]}</Badge>
              </div>
              <p className="text-ink/55">{s.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
