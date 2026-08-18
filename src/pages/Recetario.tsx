import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import * as repo from '@/services/db';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { SYSTEM_CATEGORIES } from '@/types';

export default function Recetario() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(searchParams.get('favorites') === 'true');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    repo.listUserRecipes(user.uid, { favoritesOnly, category: category ?? undefined, q: q || undefined }).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, [user, q, favoritesOnly, category]);

  async function toggleFavorite(recipeId: string) {
    if (!user) return;
    setRows((prev) => prev.map((r) => (r.recipeId === recipeId ? { ...r, isFavorite: !r.isFavorite } : r)));
    await repo.toggleFavorite(user.uid, recipeId);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mi recetario</h1>
        <p className="text-sm text-ink/60 mt-1">Todo lo que has guardado, valorado o probado.</p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en mis recetas…"
            className="w-full rounded-xl border border-black/10 bg-cream/40 pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-paprika-400"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)}>
            ❤️ Favoritas
          </Chip>
          {SYSTEM_CATEGORIES.filter((c) => c !== 'Favoritas').map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
              {c}
            </Chip>
          ))}
        </div>
      </Card>

      {!loading && rows.length === 0 && (
        <p className="text-sm text-ink/40 text-center py-10">
          Aún no tienes recetas guardadas con estos filtros. Prueba el{' '}
          <Link to="/generar" className="text-paprika-600 underline">
            Chef IA
          </Link>
          .
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {rows.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={{
              id: r.recipeId,
              name: r.summary?.name,
              description: r.summary?.description,
              difficulty: r.summary?.difficulty,
              totalTimeMin: r.summary?.totalTimeMin,
              airFryerTimeMin: r.summary?.airFryerTimeMin,
              servingsBase: r.summary?.servingsBase,
              isDualZone: r.summary?.isDualZone,
              isFavorite: r.isFavorite
            }}
            onView={() => navigate(`/recetas/${r.recipeId}`)}
            onFavoriteToggle={() => toggleFavorite(r.recipeId)}
          />
        ))}
      </div>
    </div>
  );
}
