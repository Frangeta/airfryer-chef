import { useEffect, useState } from 'react';
import { Save, Database, Check } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import * as repo from '@/services/db';
import { runInitialSeed } from '@/services/seed';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ServingsSelector } from '@/components/recipe/ServingsSelector';
import { DIFFICULTY } from '@/types';

const DIFFICULTY_LABEL: Record<string, string> = { FACIL: 'Fácil', MEDIA: 'Media', AVANZADA: 'Avanzada' };
const DIET_OPTIONS = ['Vegetariano', 'Vegano', 'Sin gluten', 'Sin lactosa', 'Bajo en sal', 'Bajo en grasa'];

export default function Configuracion() {
  const { user } = useAuth();
  const [models, setModels] = useState<any[]>([]);
  const [airFryerModelId, setAirFryerModelId] = useState('');
  const [defaultServings, setDefaultServings] = useState(4);
  const [maxCookTimeMinutes, setMaxCookTimeMinutes] = useState<number | ''>('');
  const [difficultyLevel, setDifficultyLevel] = useState('MEDIA');
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [draftExcluded, setDraftExcluded] = useState('');
  const [draftAllergy, setDraftAllergy] = useState('');
  const [saved, setSaved] = useState(false);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([repo.listAirFryerModels(), repo.getUserDoc(user.uid)]).then(([airFryers, userDoc]) => {
      setModels(airFryers);
      if (userDoc) {
        setAirFryerModelId(userDoc.airFryerModelId ?? '');
        const pref = userDoc.preference ?? {};
        setDefaultServings(pref.defaultServings ?? 4);
        setMaxCookTimeMinutes(pref.maxCookTimeMinutes ?? '');
        setDifficultyLevel(pref.difficultyLevel ?? 'MEDIA');
        setExcludedIngredients(pref.excludedIngredients ?? []);
        setAllergies(pref.allergies ?? []);
        setDietaryPreferences(pref.dietaryPreferences ?? []);
      }
      setLoading(false);
    });
  }, [user]);

  async function save() {
    if (!user) return;
    if (airFryerModelId) await repo.setAirFryerModel(user.uid, airFryerModelId);
    await repo.updatePreferences(user.uid, {
      defaultServings,
      maxCookTimeMinutes: maxCookTimeMinutes === '' ? null : maxCookTimeMinutes,
      difficultyLevel,
      excludedIngredients,
      allergies,
      dietaryPreferences
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSeed() {
    if (!user) return;
    setSeedStatus('loading');
    await runInitialSeed(user.uid, user.displayName ?? 'Fran');
    const airFryers = await repo.listAirFryerModels();
    setModels(airFryers);
    if (!airFryerModelId && airFryers[0]) setAirFryerModelId(airFryers[0].id);
    setSeedStatus('done');
  }

  if (loading) return <div className="text-center py-16 text-ink/40">Cargando ajustes…</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-ink/60 mt-1">Esto ajusta cómo la IA genera y adapta tus recetas.</p>
      </div>

      {models.length === 0 && (
        <Card className="p-5 space-y-3 border border-paprika-200">
          <div className="flex items-start gap-2.5">
            <Database className="w-5 h-5 text-paprika-500 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-ink/80">Primera vez por aquí</h2>
              <p className="text-xs text-ink/55 mt-1">
                Carga el modelo Gourmia GAF1180, ~25 alimentos con perfiles de cocción y 4 recetas de ejemplo. Solo hace
                falta una vez.
              </p>
            </div>
          </div>
          <Button onClick={handleSeed} disabled={seedStatus === 'loading'}>
            {seedStatus === 'loading' ? 'Cargando…' : seedStatus === 'done' ? (
              <>
                <Check className="w-4 h-4" /> Cargado
              </>
            ) : (
              'Cargar datos iniciales'
            )}
          </Button>
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink/70">Mi Air Fryer</h2>
        <div className="grid gap-2">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => setAirFryerModelId(m.id)}
              className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                airFryerModelId === m.id ? 'border-paprika-400 bg-paprika-50' : 'border-black/10 hover:border-black/20'
              }`}
            >
              <div className="font-medium text-sm">
                {m.brand} {m.model}
              </div>
              <div className="text-xs text-ink/50 mt-0.5">
                {m.capacityLiters} L · {m.dualZone ? 'Doble cesta' : 'Cesta única'} · máx. {m.maxTempC} ºC
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink/70">Comensales habituales</h2>
        <ServingsSelector value={defaultServings} onChange={setDefaultServings} />
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink/70">Tiempo máximo habitual para cocinar</h2>
        <input
          type="number"
          value={maxCookTimeMinutes}
          onChange={(e) => setMaxCookTimeMinutes(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="Ej. 45 min"
          className="w-32 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-paprika-400"
        />
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink/70">Nivel de dificultad preferido</h2>
        <div className="flex gap-2">
          {DIFFICULTY.map((d) => (
            <Chip key={d} active={difficultyLevel === d} onClick={() => setDifficultyLevel(d)}>
              {DIFFICULTY_LABEL[d]}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink/70">Preferencias alimentarias</h2>
        <div className="flex flex-wrap gap-1.5">
          {DIET_OPTIONS.map((d) => (
            <Chip
              key={d}
              active={dietaryPreferences.includes(d)}
              onClick={() => setDietaryPreferences((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))}
            >
              {d}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink/70">Ingredientes que no consumes</h2>
        <div className="flex flex-wrap gap-1.5">
          {excludedIngredients.map((i) => (
            <Chip key={i} onRemove={() => setExcludedIngredients((prev) => prev.filter((x) => x !== i))}>
              {i}
            </Chip>
          ))}
        </div>
        <input
          value={draftExcluded}
          onChange={(e) => setDraftExcluded(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draftExcluded.trim()) {
              setExcludedIngredients((prev) => [...prev, draftExcluded.trim()]);
              setDraftExcluded('');
            }
          }}
          placeholder="Ej. cilantro"
          className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-paprika-400"
        />
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-ink/70">Alergias / intolerancias</h2>
        <div className="flex flex-wrap gap-1.5">
          {allergies.map((i) => (
            <Chip key={i} onRemove={() => setAllergies((prev) => prev.filter((x) => x !== i))}>
              {i}
            </Chip>
          ))}
        </div>
        <input
          value={draftAllergy}
          onChange={(e) => setDraftAllergy(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draftAllergy.trim()) {
              setAllergies((prev) => [...prev, draftAllergy.trim()]);
              setDraftAllergy('');
            }
          }}
          placeholder="Ej. marisco, frutos secos"
          className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-paprika-400"
        />
      </Card>

      <Button onClick={save} className="w-full md:w-auto">
        <Save className="w-4 h-4" /> {saved ? 'Guardado ✓' : 'Guardar cambios'}
      </Button>
    </div>
  );
}
