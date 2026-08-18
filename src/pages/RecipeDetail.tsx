import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Flame, Layers, ThermometerSun, AlertTriangle, Repeat, RotateCw } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import * as repo from '@/services/db';
import { buildAIContextForUser } from '@/services/recipeGeneration';
import { Card } from '@/components/ui/Card';
import { Badge, DifficultyBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ServingsSelector } from '@/components/recipe/ServingsSelector';
import { RatingPicker } from '@/components/recipe/RatingPicker';
import { DualBasketTimeline, type TimelineZone } from '@/components/recipe/DualBasketTimeline';
import { SubstitutionWidget } from '@/components/recipe/SubstitutionWidget';
import { scaleQuantity, formatQuantity } from '@/lib/scaling';
import type { AIContext } from '@/types';

const GROUP_LABEL: Record<string, string> = { PRINCIPAL: 'Ingredientes principales', CONDIMENTO: 'Condimentos', OPCIONAL: 'Opcionales' };
const ADJUSTMENT_TYPES = ['TIEMPO', 'TEMPERATURA', 'SAL', 'OTRO'];

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<any>(null);
  const [userRecipe, setUserRecipe] = useState<any>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [aiContext, setAiContext] = useState<AIContext | null>(null);
  const [loading, setLoading] = useState(true);

  const [servings, setServings] = useState(4);
  const [isFavorite, setIsFavorite] = useState(false);
  const [rating, setRating] = useState<string | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('');
  const [adjustmentValue, setAdjustmentValue] = useState('');

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([repo.getRecipe(id), repo.getUserRecipeMeta(user.uid, id), repo.getUserDoc(user.uid)]).then(
      ([r, ur, userDoc]) => {
        setRecipe(r);
        setUserRecipe(ur);
        setAllCategories(userDoc?.categories ?? []);
        setServings(ur?.personalServings ?? (r as any)?.servingsBase ?? 4);
        setIsFavorite(ur?.isFavorite ?? false);
        setRating(ur?.ratings?.[ur.ratings.length - 1]?.rating ?? null);
        setNotes(ur?.notes ?? []);
        setCategories(ur?.categories ?? []);
        setLoading(false);
      }
    );
    buildAIContextForUser(user.uid, { userRequest: 'sustitución de ingrediente' })
      .then(setAiContext)
      .catch(() => setAiContext(null));
  }, [id, user]);

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return recipe.ingredients.map((i: any, idx: number) => ({
      ...i,
      _id: idx,
      scaledQuantity: scaleQuantity(i.quantity, recipe.servingsBase, servings, i.unit)
    }));
  }, [recipe, servings]);

  if (loading || !recipe) return <div className="text-center py-16 text-ink/40">Cargando receta…</div>;

  const groups = ['PRINCIPAL', 'CONDIMENTO', 'OPCIONAL']
    .map((g) => ({ group: g, items: scaledIngredients.filter((i: any) => i.group === g) }))
    .filter((g) => g.items.length > 0);

  const timelineZones: TimelineZone[] | null =
    recipe.isDualZone && recipe.zones?.length === 2
      ? recipe.zones.map((z: any) => {
          const relatedStep = recipe.steps.find((s: any) => s.zone === z.zone && (s.requiresShaking || s.requiresFlipping));
          const checkpoints = relatedStep
            ? [
                {
                  atGlobalMinute: z.startOffsetMin + Math.round(z.timeMin / 2),
                  action: relatedStep.requiresShaking ? ('AGITAR' as const) : ('VOLTEAR' as const)
                }
              ]
            : [];
          return { zone: z.zone, foodLabel: z.foodLabel, tempC: z.tempC, timeMin: z.timeMin, startOffsetMin: z.startOffsetMin, checkpoints };
        })
      : null;
  const globalTotalMin = timelineZones ? Math.max(...timelineZones.map((z) => z.startOffsetMin + z.timeMin)) : 0;
  const startTogether = timelineZones ? timelineZones.every((z) => z.startOffsetMin === 0) : true;

  async function toggleFavorite() {
    if (!user || !id) return;
    setIsFavorite((f) => !f);
    await repo.toggleFavorite(user.uid, id);
  }
  async function setRatingRemote(value: string) {
    if (!user || !id) return;
    setRating(value);
    await repo.setRating(user.uid, id, value);
  }
  async function toggleCategory(name: string) {
    if (!user || !id) return;
    const active = categories.includes(name);
    setCategories((prev) => (active ? prev.filter((c) => c !== name) : [...prev, name]));
    await repo.toggleCategory(user.uid, id, name, !active);
  }
  async function submitNote() {
    if (!user || !id || !noteDraft.trim()) return;
    await repo.addNote(user.uid, id, noteDraft, adjustmentType || undefined, adjustmentValue || undefined);
    setNotes((prev) => [...prev, { note: noteDraft, adjustmentType, adjustmentValue }]);
    setNoteDraft('');
    setAdjustmentType('');
    setAdjustmentValue('');
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 py-6 space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{recipe.name}</h1>
          <button onClick={toggleFavorite} className="text-2xl shrink-0" aria-label="Favorita">
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
        <p className="text-ink/60">{recipe.description}</p>
        <div className="flex flex-wrap gap-2">
          <DifficultyBadge difficulty={recipe.difficulty} />
          <Badge variant="neutral">
            <Clock className="w-3 h-3" /> {recipe.totalTimeMin} min totales
          </Badge>
          <Badge variant="neutral">
            <Flame className="w-3 h-3" /> {recipe.airFryerTimeMin} min en Air Fryer
          </Badge>
          {recipe.isDualZone && (
            <Badge variant="paprika">
              <Layers className="w-3 h-3" /> Doble cesta
            </Badge>
          )}
          {recipe.cuisineType && <Badge variant="neutral">{recipe.cuisineType}</Badge>}
        </div>
      </div>

      {recipe.safetyNotes && (
        <Card className="p-4 bg-warn/5 shadow-none flex gap-2.5 items-start">
          <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
          <p className="text-sm text-ink/70">{recipe.safetyNotes}</p>
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <ServingsSelector value={servings} onChange={setServings} />
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.group}>
              <h3 className="text-sm font-semibold text-ink/70 mb-2">{GROUP_LABEL[g.group]}</h3>
              <ul className="space-y-1.5">
                {g.items.map((i: any) => (
                  <li key={i._id}>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink/80">{i.name}</span>
                      <span className="font-mono text-ink/50">
                        {formatQuantity(i.scaledQuantity)} {i.unit}
                      </span>
                    </div>
                    {g.group === 'PRINCIPAL' && aiContext && (
                      <SubstitutionWidget ingredientName={i.name} recipeContext={`${recipe.name}: ${recipe.description}`} context={aiContext} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {timelineZones && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink/70 mb-4 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-paprika-500" /> Sincronización de doble cesta
          </h3>
          <DualBasketTimeline zones={timelineZones} globalTotalMin={globalTotalMin} startTogether={startTogether} />
        </Card>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-ink/70 mb-3">Preparación</h3>
        <ol className="space-y-3">
          {recipe.steps.map((s: any, idx: number) => (
            <li key={idx} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-paprika-50 text-paprika-600 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                {s.stepNumber}
              </span>
              <div className="space-y-1">
                <p className="text-sm text-ink/80">{s.instruction}</p>
                {(s.tempC || s.timeMin || s.zone === 'CESTA_1' || s.zone === 'CESTA_2') && (
                  <div className="flex flex-wrap gap-1.5">
                    {s.zone && s.zone !== 'NONE' && (
                      <Badge variant={s.zone === 'CESTA_1' ? 'basket1' : s.zone === 'CESTA_2' ? 'basket2' : 'neutral'}>
                        {s.zone === 'AMBAS' ? 'Ambas cestas' : s.zone.replace('CESTA_', 'Cesta ')}
                      </Badge>
                    )}
                    {s.tempC && (
                      <Badge variant="neutral">
                        <ThermometerSun className="w-3 h-3" /> {s.tempC} ºC
                      </Badge>
                    )}
                    {s.timeMin && (
                      <Badge variant="neutral">
                        <Clock className="w-3 h-3" /> {s.timeMin} min
                      </Badge>
                    )}
                    {s.requiresShaking && (
                      <Badge variant="gold">
                        <Repeat className="w-3 h-3" /> Agitar
                      </Badge>
                    )}
                    {s.requiresFlipping && (
                      <Badge variant="gold">
                        <RotateCw className="w-3 h-3" /> Dar la vuelta
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink/70 mb-2">¿Qué te ha parecido?</h3>
          <RatingPicker value={rating} onChange={setRatingRemote} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink/70 mb-2">Categorías</h3>
          <div className="flex flex-wrap gap-1.5">
            {allCategories.map((c) => (
              <Chip key={c} active={categories.includes(c)} onClick={() => toggleCategory(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ink/70">Notas personales</h3>
        <div className="space-y-2">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Ej. La próxima vez poner menos sal. 18 minutos fue demasiado."
            rows={2}
            className="w-full rounded-xl border border-black/10 bg-cream/40 px-3.5 py-2.5 text-sm outline-none focus:border-paprika-400 resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value)}
              className="text-sm rounded-lg border border-black/10 px-2 py-1.5 bg-paper"
            >
              <option value="">Sin ajuste concreto</option>
              {ADJUSTMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {adjustmentType && (
              <input
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
                placeholder="Ej. 15 min en vez de 18"
                className="text-sm rounded-lg border border-black/10 px-2.5 py-1.5 flex-1 min-w-[160px]"
              />
            )}
            <Button size="sm" onClick={submitNote}>
              Guardar nota
            </Button>
          </div>
        </div>
        {notes.length > 0 && (
          <ul className="space-y-2 pt-2 border-t border-black/5">
            {notes.map((n, i) => (
              <li key={i} className="text-sm text-ink/70">
                {n.note}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
