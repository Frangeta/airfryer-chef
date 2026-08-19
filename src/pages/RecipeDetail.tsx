import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  Flame,
  Layers,
  ThermometerSun,
  AlertTriangle,
  Repeat,
  RotateCw,
  Pencil,
  Copy,
  Trash2,
  Plus,
  X,
  Save
} from 'lucide-react';
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
import { DIFFICULTY, INGREDIENT_GROUP, ZONE } from '@/types';
import type { AIContext } from '@/types';

const GROUP_LABEL: Record<string, string> = { PRINCIPAL: 'Ingredientes principales', CONDIMENTO: 'Condimentos', OPCIONAL: 'Opcionales' };
const ADJUSTMENT_TYPES = ['TIEMPO', 'TEMPERATURA', 'SAL', 'OTRO'];

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipe, setRecipe] = useState<any>(null);
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
  const [newCategoryDraft, setNewCategoryDraft] = useState('');

  // --- Edición ---
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editIngredients, setEditIngredients] = useState<any[]>([]);
  const [editSteps, setEditSteps] = useState<any[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  function load() {
    if (!id || !user) return;
    setLoading(true);
    Promise.all([repo.getRecipe(id), repo.getUserRecipeMeta(user.uid, id), repo.getUserDoc(user.uid)]).then(
      ([r, ur, userDoc]) => {
        setRecipe(r);
        setAllCategories(userDoc?.categories ?? []);
        setServings((ur as any)?.personalServings ?? (r as any)?.servingsBase ?? 4);
        setIsFavorite((ur as any)?.isFavorite ?? false);
        setRating((ur as any)?.ratings?.[(ur as any).ratings.length - 1]?.rating ?? null);
        setNotes((ur as any)?.notes ?? []);
        setCategories((ur as any)?.categories ?? []);
        setLoading(false);
      }
    );
    buildAIContextForUser(user.uid, { userRequest: 'sustitución de ingrediente' })
      .then(setAiContext)
      .catch(() => setAiContext(null));
  }

  useEffect(load, [id, user]);

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
  async function createCategory() {
    const name = newCategoryDraft.trim();
    if (!name) return;
    setNewCategoryDraft('');
    setAllCategories((prev) => (prev.includes(name) ? prev : [...prev, name]));
    await toggleCategory(name);
  }
  async function submitNote() {
    if (!user || !id || !noteDraft.trim()) return;
    await repo.addNote(user.uid, id, noteDraft, adjustmentType || undefined, adjustmentValue || undefined);
    setNotes((prev) => [...prev, { note: noteDraft, adjustmentType, adjustmentValue }]);
    setNoteDraft('');
    setAdjustmentType('');
    setAdjustmentValue('');
  }

  function startEdit() {
    setEditForm({
      name: recipe.name,
      description: recipe.description,
      difficulty: recipe.difficulty,
      servingsBase: recipe.servingsBase,
      totalTimeMin: recipe.totalTimeMin,
      airFryerTimeMin: recipe.airFryerTimeMin,
      cuisineType: recipe.cuisineType ?? '',
      safetyNotes: recipe.safetyNotes ?? ''
    });
    setEditIngredients(recipe.ingredients.map((i: any) => ({ ...i })));
    setEditSteps(recipe.steps.map((s: any) => ({ ...s })));
    setEditMode(true);
  }

  async function saveEdit() {
    if (!user || !id) return;
    setSavingEdit(true);
    const patch = {
      name: editForm.name,
      description: editForm.description,
      difficulty: editForm.difficulty,
      servingsBase: Number(editForm.servingsBase) || recipe.servingsBase,
      totalTimeMin: Number(editForm.totalTimeMin) || recipe.totalTimeMin,
      airFryerTimeMin: Number(editForm.airFryerTimeMin) || recipe.airFryerTimeMin,
      cuisineType: editForm.cuisineType || null,
      safetyNotes: editForm.safetyNotes || null,
      ingredients: editIngredients.map((i: any) => ({
        name: i.name,
        quantity: Number(i.quantity) || 0,
        unit: i.unit,
        group: i.group
      })),
      steps: editSteps.map((s: any, idx: number) => ({
        stepNumber: idx + 1,
        instruction: s.instruction,
        tempC: s.tempC === '' || s.tempC == null ? null : Number(s.tempC),
        timeMin: s.timeMin === '' || s.timeMin == null ? null : Number(s.timeMin),
        zone: s.zone || null,
        requiresShaking: !!s.requiresShaking,
        requiresFlipping: !!s.requiresFlipping
      }))
    };
    await repo.updateRecipe(user.uid, id, patch);
    setRecipe((prev: any) => ({ ...prev, ...patch }));
    setSavingEdit(false);
    setEditMode(false);
  }

  async function handleDuplicate() {
    if (!user || !id) return;
    const copy = await repo.duplicateRecipe(user.uid, id);
    navigate(`/recetas/${copy.id}`);
  }

  async function handleDelete() {
    if (!user || !id) return;
    if (!window.confirm(`¿Eliminar "${recipe.name}"? Esta acción no se puede deshacer.`)) return;
    await repo.deleteRecipe(user.uid, id);
    navigate('/recetario');
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 py-6 space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          {editMode ? (
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
              className="text-2xl font-semibold tracking-tight flex-1 rounded-lg border border-black/10 px-2 py-1 outline-none focus:border-paprika-400"
            />
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">{recipe.name}</h1>
          )}
          {!editMode && (
            <button onClick={toggleFavorite} className="text-2xl shrink-0" aria-label="Favorita">
              {isFavorite ? '❤️' : '🤍'}
            </button>
          )}
        </div>

        {editMode ? (
          <textarea
            value={editForm.description}
            onChange={(e) => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-paprika-400 resize-none"
          />
        ) : (
          <p className="text-ink/60">{recipe.description}</p>
        )}

        {!editMode && (
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
        )}

        {/* Acciones de gestión de la receta */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!editMode ? (
            <>
              <Button variant="secondary" size="sm" onClick={startEdit}>
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDuplicate}>
                <Copy className="w-3.5 h-3.5" /> Duplicar
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-warn hover:bg-warn/10">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={saveEdit} disabled={savingEdit}>
                <Save className="w-3.5 h-3.5" /> {savingEdit ? 'Guardando…' : 'Guardar cambios'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                Cancelar
              </Button>
            </>
          )}
        </div>
      </div>

      {editMode && (
        <Card className="p-5 grid sm:grid-cols-2 gap-3">
          <label className="text-sm space-y-1">
            <span className="text-ink/60">Dificultad</span>
            <select
              value={editForm.difficulty}
              onChange={(e) => setEditForm((f: any) => ({ ...f, difficulty: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-2 py-1.5 bg-paper"
            >
              {DIFFICULTY.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink/60">Comensales base</span>
            <input
              type="number"
              value={editForm.servingsBase}
              onChange={(e) => setEditForm((f: any) => ({ ...f, servingsBase: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-2 py-1.5"
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink/60">Tiempo total (min)</span>
            <input
              type="number"
              value={editForm.totalTimeMin}
              onChange={(e) => setEditForm((f: any) => ({ ...f, totalTimeMin: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-2 py-1.5"
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink/60">Tiempo en Air Fryer (min)</span>
            <input
              type="number"
              value={editForm.airFryerTimeMin}
              onChange={(e) => setEditForm((f: any) => ({ ...f, airFryerTimeMin: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-2 py-1.5"
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-ink/60">Tipo de cocina</span>
            <input
              value={editForm.cuisineType}
              onChange={(e) => setEditForm((f: any) => ({ ...f, cuisineType: e.target.value }))}
              placeholder="Ej. española"
              className="w-full rounded-lg border border-black/10 px-2 py-1.5"
            />
          </label>
          <label className="text-sm space-y-1 sm:col-span-2">
            <span className="text-ink/60">Notas de seguridad</span>
            <input
              value={editForm.safetyNotes}
              onChange={(e) => setEditForm((f: any) => ({ ...f, safetyNotes: e.target.value }))}
              className="w-full rounded-lg border border-black/10 px-2 py-1.5"
            />
          </label>
        </Card>
      )}

      {!editMode && recipe.safetyNotes && (
        <Card className="p-4 bg-warn/5 shadow-none flex gap-2.5 items-start">
          <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
          <p className="text-sm text-ink/70">{recipe.safetyNotes}</p>
        </Card>
      )}

      {!editMode ? (
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
      ) : (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink/70">Ingredientes</h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditIngredients((prev) => [...prev, { name: '', quantity: 1, unit: 'g', group: 'PRINCIPAL' }])}
            >
              <Plus className="w-3.5 h-3.5" /> Añadir
            </Button>
          </div>
          {editIngredients.map((ing, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <input
                value={ing.name}
                onChange={(e) =>
                  setEditIngredients((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                }
                placeholder="Nombre"
                className="flex-1 min-w-[120px] rounded-lg border border-black/10 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                value={ing.quantity}
                onChange={(e) =>
                  setEditIngredients((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))
                }
                className="w-20 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
              />
              <input
                value={ing.unit}
                onChange={(e) =>
                  setEditIngredients((prev) => prev.map((x, i) => (i === idx ? { ...x, unit: e.target.value } : x)))
                }
                placeholder="unidad"
                className="w-20 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
              />
              <select
                value={ing.group}
                onChange={(e) =>
                  setEditIngredients((prev) => prev.map((x, i) => (i === idx ? { ...x, group: e.target.value } : x)))
                }
                className="rounded-lg border border-black/10 px-2 py-1.5 text-sm bg-paper"
              >
                {INGREDIENT_GROUP.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setEditIngredients((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="Quitar"
                className="text-ink/30 hover:text-warn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </Card>
      )}

      {timelineZones && !editMode && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink/70 mb-4 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-paprika-500" /> Sincronización de doble cesta
          </h3>
          <DualBasketTimeline zones={timelineZones} globalTotalMin={globalTotalMin} startTogether={startTogether} />
          <p className="text-xs text-ink/40 mt-3">
            El timeline se recalcula solo a partir de los tiempos de cada cesta — si editas los pasos, guarda y vuelve a
            entrar para verlo actualizado.
          </p>
        </Card>
      )}

      {!editMode ? (
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
      ) : (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink/70">Pasos</h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setEditSteps((prev) => [
                  ...prev,
                  { instruction: '', tempC: '', timeMin: '', zone: 'NONE', requiresShaking: false, requiresFlipping: false }
                ])
              }
            >
              <Plus className="w-3.5 h-3.5" /> Añadir paso
            </Button>
          </div>
          {editSteps.map((s, idx) => (
            <div key={idx} className="rounded-xl border border-black/10 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-ink/40 mt-2">{idx + 1}</span>
                <textarea
                  value={s.instruction}
                  onChange={(e) => setEditSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, instruction: e.target.value } : x)))}
                  rows={2}
                  className="flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-sm resize-none"
                />
                <button
                  onClick={() => setEditSteps((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="Quitar paso"
                  className="text-ink/30 hover:text-warn mt-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-6">
                <input
                  type="number"
                  value={s.tempC ?? ''}
                  onChange={(e) => setEditSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, tempC: e.target.value } : x)))}
                  placeholder="ºC"
                  className="w-20 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  value={s.timeMin ?? ''}
                  onChange={(e) => setEditSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, timeMin: e.target.value } : x)))}
                  placeholder="min"
                  className="w-20 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
                />
                <select
                  value={s.zone ?? 'NONE'}
                  onChange={(e) => setEditSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, zone: e.target.value } : x)))}
                  className="rounded-lg border border-black/10 px-2 py-1.5 text-sm bg-paper"
                >
                  {ZONE.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-ink/60">
                  <input
                    type="checkbox"
                    checked={!!s.requiresShaking}
                    onChange={(e) => setEditSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, requiresShaking: e.target.checked } : x)))}
                  />
                  Agitar
                </label>
                <label className="flex items-center gap-1.5 text-xs text-ink/60">
                  <input
                    type="checkbox"
                    checked={!!s.requiresFlipping}
                    onChange={(e) => setEditSteps((prev) => prev.map((x, i) => (i === idx ? { ...x, requiresFlipping: e.target.checked } : x)))}
                  />
                  Dar la vuelta
                </label>
              </div>
            </div>
          ))}
        </Card>
      )}

      {!editMode && (
        <>
          <Card className="p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-ink/70 mb-2">¿Qué te ha parecido?</h3>
              <RatingPicker value={rating} onChange={setRatingRemote} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink/70 mb-2">Categorías</h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {allCategories.map((c) => (
                  <Chip key={c} active={categories.includes(c)} onClick={() => toggleCategory(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newCategoryDraft}
                  onChange={(e) => setNewCategoryDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createCategory()}
                  placeholder="Nueva categoría…"
                  className="flex-1 min-w-[140px] rounded-lg border border-black/10 px-2.5 py-1.5 text-sm outline-none focus:border-paprika-400"
                />
                <Button size="sm" variant="secondary" onClick={createCategory}>
                  <Plus className="w-3.5 h-3.5" /> Crear
                </Button>
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
        </>
      )}
    </div>
  );
}
