import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Sparkles, Loader2, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import * as repo from '@/services/db';
import { generateProposals } from '@/services/recipeGeneration';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Spinner } from '@/components/ui/Spinner';
import { IngredientChipInput } from '@/components/ingredients/IngredientChipInput';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { DualBasketTimeline } from '@/components/recipe/DualBasketTimeline';

const PANTRY_SUGGESTIONS = ['Pollo', 'Patatas', 'Cebolla', 'Pimiento', 'Salmón', 'Huevo', 'Brócoli'];

const INTENT_CHIPS = [
  'Cena rápida', 'Cena ligera', 'Algo crujiente', 'Algo saludable', 'Algo tipo restaurante',
  'Receta mexicana', 'Receta italiana', 'Receta española', 'Receta asiática',
  'Aprovechar sobras', 'Con pollo', 'Con pescado', 'Vegetariano', 'Menos de 20 minutos'
];

interface ProposalVM {
  recipe: any;
  validation: { valid: boolean; needsReview: boolean; issues: { level: string; message: string }[] };
  dualBasketPreview?: any;
  matchPercentage: number;
  savedRecipeId?: string;
  saving?: boolean;
  expanded?: boolean;
}

export default function Generar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [userRequest, setUserRequest] = useState(searchParams.get('q') ?? '');
  const [maxTime, setMaxTime] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalVM[]>([]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) handleGenerate(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate(prefill?: string) {
    const request = prefill ?? userRequest;
    if (!request && ingredients.length === 0) {
      setError('Escribe qué te apetece o añade al menos un ingrediente.');
      return;
    }
    if (!user) return;
    setError(null);
    setLoading(true);
    setProposals([]);
    try {
      const { proposals } = await generateProposals(user.uid, {
        availableIngredients: ingredients.length > 0 ? ingredients : undefined,
        userRequest: request || `Tengo estos ingredientes: ${ingredients.join(', ')}`,
        constraints: { max_time_minutes: maxTime === '' ? undefined : maxTime }
      });
      setProposals(proposals.map((p) => ({ ...p, saving: false, expanded: false })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  async function ensureSaved(index: number): Promise<string | undefined> {
    if (!user) return;
    const p = proposals[index];
    if (p.savedRecipeId) return p.savedRecipeId;
    setProposals((prev) => prev.map((x, i) => (i === index ? { ...x, saving: true } : x)));
    try {
      const userDoc = await repo.getUserDoc(user.uid);
      const created = await repo.persistGeneratedRecipe(p.recipe, {
        uid: user.uid,
        airFryerModelId: userDoc?.airFryerModelId ?? null,
        saveToRecetario: true
      });
      setProposals((prev) => prev.map((x, i) => (i === index ? { ...x, savedRecipeId: created.id, saving: false } : x)));
      return created.id;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error guardando.');
      setProposals((prev) => prev.map((x, i) => (i === index ? { ...x, saving: false } : x)));
    }
  }

  async function handleSave(index: number) {
    const id = await ensureSaved(index);
    if (id) navigate(`/recetas/${id}`);
  }

  async function handleRate(index: number, rating: 'LIKE' | 'DISLIKE') {
    if (!user) return;
    const id = await ensureSaved(index);
    if (!id) return;
    await repo.setRating(user.uid, id, rating);
  }

  function toggleExpand(index: number) {
    setProposals((prev) => prev.map((x, i) => (i === index ? { ...x, expanded: !x.expanded } : x)));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 py-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-paprika-500" /> Chef IA
          </h1>
          <p className="text-sm text-ink/60 mt-1">
            Cuéntame qué tienes en la nevera o qué te apetece — te propongo recetas listas para tu Gourmia.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 mt-1">
          <Link to="/chat" className="text-xs text-paprika-600 hover:underline whitespace-nowrap">
            💬 Modo chat
          </Link>
          <Link to="/convertir" className="text-xs text-paprika-600 hover:underline whitespace-nowrap">
            <ArrowLeftRight className="w-3.5 h-3.5 inline mr-1" />
            Convertir receta
          </Link>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-ink/80 block mb-2">Tengo estos ingredientes</label>
          <IngredientChipInput ingredients={ingredients} onChange={setIngredients} suggestions={PANTRY_SUGGESTIONS} />
        </div>

        <div>
          <label className="text-sm font-medium text-ink/80 block mb-2">¿Qué te apetece?</label>
          <textarea
            value={userRequest}
            onChange={(e) => setUserRequest(e.target.value)}
            placeholder='Ej. "Quiero una cena rápida para 4" o "algo tipo kebab con pollo"'
            rows={2}
            className="w-full rounded-xl border border-black/10 bg-cream/40 px-3.5 py-2.5 text-sm outline-none focus:border-paprika-400 resize-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {INTENT_CHIPS.map((chip) => (
            <Chip key={chip} active={userRequest === chip} onClick={() => setUserRequest(chip)}>
              {chip}
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-ink/60">Tiempo máx.</label>
          <input
            type="number"
            min={5}
            max={90}
            value={maxTime}
            onChange={(e) => setMaxTime(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="min"
            className="w-20 rounded-lg border border-black/10 px-2 py-1.5 text-sm outline-none focus:border-paprika-400"
          />
        </div>

        {error && <p className="text-sm text-warn">{error}</p>}

        <Button onClick={() => handleGenerate()} disabled={loading} className="w-full md:w-auto">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Pensando recetas…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Generar recetas
            </>
          )}
        </Button>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-10 text-ink/40">
          <Spinner className="w-6 h-6" />
        </div>
      )}

      <div className="space-y-4">
        {proposals.map((p, index) => (
          <div key={index} className="space-y-3">
            <RecipeCard
              recipe={{
                name: p.recipe.name,
                description: p.recipe.description,
                difficulty: p.recipe.difficulty,
                totalTimeMin: p.recipe.total_time_min,
                airFryerTimeMin: p.recipe.air_fryer_time_min,
                servingsBase: p.recipe.servings_base,
                isDualZone: p.recipe.is_dual_zone,
                matchPercentage: p.matchPercentage,
                missingIngredients: p.recipe.missing_ingredients,
                needsReview: p.validation.needsReview || !p.validation.valid
              }}
              onView={() => toggleExpand(index)}
              onSave={() => handleSave(index)}
              onLike={() => handleRate(index, 'LIKE')}
              onDislike={() => handleRate(index, 'DISLIKE')}
              saving={p.saving}
            />
            {p.expanded && (
              <Card className="p-5 space-y-4">
                {!p.validation.valid && (
                  <div className="text-sm text-warn bg-warn/5 rounded-lg p-3">
                    Esta propuesta tiene datos que no cuadran con la base de conocimiento. Revísala antes de guardar:
                    <ul className="list-disc list-inside mt-1">
                      {p.validation.issues.filter((i) => i.level === 'ERROR').map((i, k) => (
                        <li key={k}>{i.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-ink/80 mb-2">Ingredientes</h4>
                  <ul className="text-sm text-ink/70 space-y-1">
                    {p.recipe.ingredients.map((ing: any, k: number) => (
                      <li key={k}>
                        {ing.quantity} {ing.unit} · {ing.name}
                        {ing.group === 'OPCIONAL' && <span className="text-ink/40"> (opcional)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-ink/80 mb-2">Pasos</h4>
                  <ol className="text-sm text-ink/70 space-y-1.5 list-decimal list-inside">
                    {p.recipe.steps.map((s: any) => (
                      <li key={s.step_number}>
                        {s.instruction}
                        {s.temp_c && s.time_min ? ` — ${s.temp_c} ºC, ${s.time_min} min` : ''}
                      </li>
                    ))}
                  </ol>
                </div>
                {p.dualBasketPreview && (
                  <div>
                    <h4 className="text-sm font-semibold text-ink/80 mb-3">Sincronización de doble cesta</h4>
                    <DualBasketTimeline
                      zones={p.dualBasketPreview.zones}
                      globalTotalMin={p.dualBasketPreview.globalTotalMin}
                      startTogether={p.dualBasketPreview.startTogether}
                    />
                  </div>
                )}
                {p.recipe.safety_notes && (
                  <p className="text-xs text-ink/50 border-t border-black/5 pt-3">⚠️ {p.recipe.safety_notes}</p>
                )}
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
