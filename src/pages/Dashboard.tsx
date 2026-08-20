import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, CookingPot, Table2, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import * as repo from '@/services/db';
import { Card } from '@/components/ui/Card';
import { DifficultyBadge } from '@/components/ui/Badge';
import { DashboardPromptBox } from '@/components/dashboard/DashboardPromptBox';

export default function Dashboard() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [sampleFoods, setSampleFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([repo.listUserRecipes(user.uid, { favoritesOnly: true }), repo.listUserRecipes(user.uid), repo.listFoods()]).then(
      ([favs, all, foods]) => {
        setFavorites(favs.slice(0, 8));
        setRecent(all.slice(0, 4));
        setSampleFoods(foods.slice(0, 5));
        setLoading(false);
      }
    );
  }, [user]);

  const quickRecipes = recent.filter((r) => (r.summary?.airFryerTimeMin ?? 999) <= 20).slice(0, 6);

  if (loading) return <div className="text-center py-16 text-ink/40">Cargando tu cocina…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-8">
      <DashboardPromptBox />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ShortcutCard to="/generar" icon={<CookingPot className="w-5 h-5" />} label="Tengo estos ingredientes" variant="paprika" />
        <ShortcutCard to="/chat" icon={<MessageCircle className="w-5 h-5" />} label="Chef IA en modo chat" variant="basket2" />
        <ShortcutCard to="/tablas" icon={<Table2 className="w-5 h-5" />} label="Tabla rápida" variant="basket1" />
        <ShortcutCard to="/despensa" icon={<CookingPot className="w-5 h-5" />} label="Mi despensa" variant="gold" />
      </section>

      {favorites.length > 0 && (
        <Section title="Mis favoritos" to="/recetario?favorites=true">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
            {favorites.map((f) => (
              <MiniRecipeCard key={f.id} id={f.recipeId} summary={f.summary} />
            ))}
          </div>
        </Section>
      )}

      {quickRecipes.length > 0 && (
        <Section title="Cocinar rápido (menos de 20 min)" to="/recetario">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickRecipes.map((r) => (
              <MiniRecipeCard key={r.id} id={r.recipeId} summary={r.summary} />
            ))}
          </div>
        </Section>
      )}

      {recent.length > 0 && (
        <Section title="Últimas recetas" to="/recetario">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recent.map((r) => (
              <MiniRecipeCard key={r.id} id={r.recipeId} summary={r.summary} />
            ))}
          </div>
        </Section>
      )}

      {sampleFoods.length > 0 && (
        <Section title="Tabla rápida de tiempos y temperaturas" to="/tablas">
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.02] text-ink/50 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Alimento</th>
                  <th className="text-left px-4 py-2.5 font-medium">Temp.</th>
                  <th className="text-left px-4 py-2.5 font-medium">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {sampleFoods.map((f) => (
                  <tr key={f.id} className="border-t border-black/5">
                    <td className="px-4 py-2.5">{f.name}</td>
                    <td className="px-4 py-2.5 font-mono text-ink/60">{f.cookingProfile?.tempC} ºC</td>
                    <td className="px-4 py-2.5 font-mono text-ink/60">
                      {f.cookingProfile?.minTimeMin}-{f.cookingProfile?.maxTimeMin} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Section>
      )}

      {recent.length === 0 && (
        <p className="text-sm text-ink/40 text-center py-10">
          Aún no tienes recetas.{' '}
          <Link to="/generar" className="text-paprika-600 underline">
            Genera la primera con el Chef IA
          </Link>{' '}
          o ve a Ajustes para cargar los datos iniciales si es la primera vez que abres la app.
        </p>
      )}
    </div>
  );
}

function Section({ title, to, children }: { title: string; to: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-ink/85">{title}</h2>
        <Link to={to} className="text-xs text-paprika-600 flex items-center gap-0.5 hover:underline">
          Ver todo <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {children}
    </section>
  );
}

const SHORTCUT_VARIANTS: Record<string, string> = {
  paprika: 'bg-paprika-50 text-paprika-600',
  basket1: 'bg-basket1-light text-basket1-dark',
  basket2: 'bg-basket2-light text-basket2-dark',
  gold: 'bg-gold-100 text-gold-600'
};

function ShortcutCard({
  to,
  icon,
  label,
  variant = 'paprika'
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  variant?: keyof typeof SHORTCUT_VARIANTS;
}) {
  return (
    <Link to={to}>
      <Card className="p-4 flex flex-col gap-2 hover:shadow-pop transition-shadow h-full">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${SHORTCUT_VARIANTS[variant]}`}>{icon}</div>
        <span className="text-sm font-medium text-ink/80">{label}</span>
      </Card>
    </Link>
  );
}

function MiniRecipeCard({ id, summary }: { id: string; summary: any }) {
  if (!summary) return null;
  return (
    <Link to={`/recetas/${id}`} className="shrink-0 w-56 md:w-auto">
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
