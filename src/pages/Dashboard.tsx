import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, CookingPot, Table2, MessageCircle, Heart, Zap, History } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import * as repo from '@/services/db';
import { Card } from '@/components/ui/Card';
import { DifficultyBadge } from '@/components/ui/Badge';
import { DashboardPromptBox } from '@/components/dashboard/DashboardPromptBox';
import { OnboardingBanner } from '@/components/dashboard/OnboardingBanner';

type TabKey = 'favoritas' | 'rapidas' | 'recientes';

export default function Dashboard() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [sampleFoods, setSampleFoods] = useState<any[]>([]);
  const [tab, setTab] = useState<TabKey>('favoritas');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([repo.listUserRecipes(user.uid, { favoritesOnly: true }), repo.listUserRecipes(user.uid), repo.listFoods()]).then(
      ([favs, all, foods]) => {
        setFavorites(favs.slice(0, 8));
        setRecent(all.slice(0, 8));
        setSampleFoods(foods.slice(0, 4));
        setLoading(false);
      }
    );
  }, [user]);

  const quickRecipes = useMemo(() => recent.filter((r) => (r.summary?.airFryerTimeMin ?? 999) <= 20).slice(0, 8), [recent]);

  // Solo mostramos pestañas que de verdad tienen contenido, y elegimos la
  // primera con datos como pestaña activa por defecto.
  const tabs: { key: TabKey; label: string; icon: typeof Heart; data: any[] }[] = (
    [
      { key: 'favoritas', label: 'Favoritas', icon: Heart, data: favorites },
      { key: 'rapidas', label: 'Rápidas', icon: Zap, data: quickRecipes },
      { key: 'recientes', label: 'Recientes', icon: History, data: recent }
    ] as const
  ).filter((t) => t.data.length > 0) as { key: TabKey; label: string; icon: typeof Heart; data: any[] }[];

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.key === tab)) setTab(tabs[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites, quickRecipes, recent]);

  if (loading) return <div className="text-center py-16 text-ink/40">Cargando tu cocina…</div>;

  const activeTabData = tabs.find((t) => t.key === tab)?.data ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <DashboardPromptBox />

      <OnboardingBanner />

      <div className="flex flex-wrap gap-2">
        <ShortcutPill to="/generar" icon={CookingPot} label="Tengo estos ingredientes" variant="paprika" />
        <ShortcutPill to="/chat" icon={MessageCircle} label="Chef IA en chat" variant="basket2" />
        <ShortcutPill to="/tablas" icon={Table2} label="Tabla rápida" variant="basket1" />
        <ShortcutPill to="/despensa" icon={CookingPot} label="Mi despensa" variant="gold" />
      </div>

      {tabs.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-black/[0.03] rounded-xl p-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-paper shadow-card text-ink' : 'text-ink/50 hover:text-ink/75'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>
            <Link to="/recetario" className="text-xs text-paprika-600 flex items-center gap-0.5 hover:underline shrink-0">
              Ver recetario <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTabData.slice(0, 6).map((r) => (
              <MiniRecipeCard key={r.id} id={r.recipeId} summary={r.summary} />
            ))}
          </div>
        </section>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-sm text-ink/50">
            Aún no tienes recetas.{' '}
            <Link to="/generar" className="text-paprika-600 underline">
              Genera la primera con el Chef IA
            </Link>{' '}
            o ve a Configuración para cargar los datos iniciales si es la primera vez que abres la app.
          </p>
        </Card>
      )}

      {sampleFoods.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink/85 text-sm">Tabla rápida</h2>
            <Link to="/tablas" className="text-xs text-paprika-600 flex items-center gap-0.5 hover:underline">
              Ver todo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <Card className="divide-y divide-black/5">
            {sampleFoods.map((f) => (
              <Link key={f.id} to="/tablas" className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-black/[0.015]">
                <span className="text-ink/80">{f.name}</span>
                <span className="font-mono text-xs text-ink/45">
                  {f.cookingProfile?.tempC} ºC · {f.cookingProfile?.minTimeMin}-{f.cookingProfile?.maxTimeMin} min
                </span>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

const PILL_VARIANTS: Record<string, string> = {
  paprika: 'bg-paprika-50 text-paprika-600 hover:bg-paprika-100',
  basket1: 'bg-basket1-light text-basket1-dark hover:brightness-95',
  basket2: 'bg-basket2-light text-basket2-dark hover:brightness-95',
  gold: 'bg-gold-100 text-gold-600 hover:brightness-95'
};

function ShortcutPill({
  to,
  icon: Icon,
  label,
  variant
}: {
  to: string;
  icon: typeof CookingPot;
  label: string;
  variant: keyof typeof PILL_VARIANTS;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${PILL_VARIANTS[variant]}`}
    >
      <Icon className="w-4 h-4" /> {label}
    </Link>
  );
}

function MiniRecipeCard({ id, summary }: { id: string; summary: any }) {
  if (!summary) return null;
  return (
    <Link to={`/recetas/${id}`}>
      <Card className="p-4 space-y-2 hover:shadow-pop transition-shadow h-full">
        <h3 className="text-sm font-medium text-ink/85 line-clamp-2">{summary.name}</h3>
        <div className="flex items-center gap-2">
          <DifficultyBadge difficulty={summary.difficulty} />
          <span className="text-xs text-ink/45 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {summary.airFryerTimeMin} min
          </span>
        </div>
      </Card>
    </Link>
  );
}
