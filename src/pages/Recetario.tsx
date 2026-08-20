import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import * as repo from '@/services/db';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { RecipeCard } from '@/components/recipe/RecipeCard';

type SortKey = 'recent' | 'name' | 'time';

export default function Recetario() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(searchParams.get('favorites') === 'true');
  const [category, setCategory] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [loading, setLoading] = useState(true);

  function load() {
    if (!user) return;
    setLoading(true);
    Promise.all([
      repo.listUserRecipes(user.uid, { favoritesOnly, category: category ?? undefined, q: q || undefined }),
      repo.getUserDoc(user.uid)
    ]).then(([r, userDoc]) => {
      setRows(r);
      setAllCategories(userDoc?.categories ?? []);
      setLoading(false);
    });
  }

  useEffect(load, [user, q, favoritesOnly, category]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (sortKey === 'name') copy.sort((a, b) => (a.summary?.name ?? '').localeCompare(b.summary?.name ?? ''));
    else if (sortKey === 'time') copy.sort((a, b) => (a.summary?.airFryerTimeMin ?? 0) - (b.summary?.airFryerTimeMin ?? 0));
    else copy.sort((a, b) => (b.savedAt?.seconds ?? 0) - (a.savedAt?.seconds ?? 0));
    return copy;
  }, [rows, sortKey]);

  async function toggleFavorite(recipeId: string) {
    if (!user) return;
    setRows((prev) => prev.map((r) => (r.recipeId === recipeId ? { ...r, isFavorite: !r.isFavorite } : r)));
    await repo.toggleFavorite(user.uid, recipeId);
  }

  async function handleDuplicate(recipeId: string) {
    if (!user) return;
    await repo.duplicateRecipe(user.uid, recipeId);
    load();
  }

  async function handleDelete(recipeId: string, name: string) {
    if (!user) return;
    if (!window.confirm(`¿Eliminar "${name}" del recetario? Esta acción no se puede deshacer.`)) return;
    setRows((prev) => prev.filter((r) => r.recipeId !== recipeId));
    await repo.deleteRecipe(user.uid, recipeId);
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
            className="w-full rounded-xl border border-black/10 bg-cream/40 pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-teal-400"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)}>
            ❤️ Favoritas
          </Chip>
          {allCategories
            .filter((c) => c !== 'Favoritas')
            .map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
                {c}
              </Chip>
            ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <ArrowUpDown className="w-3.5 h-3.5 text-ink/40" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-sm rounded-lg border border-black/10 px-2 py-1.5 bg-paper"
          >
            <option value="recent">Guardadas recientemente</option>
            <option value="name">Nombre (A-Z)</option>
            <option value="time">Tiempo en Air Fryer</option>
          </select>
        </div>
      </Card>

      {!loading && rows.length === 0 && (
        <p className="text-sm text-ink/40 text-center py-10">
          Aún no tienes recetas guardadas con estos filtros. Prueba el{' '}
          <Link to="/generar" className="text-teal-600 underline">
            Chef IA
          </Link>
          .
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {sortedRows.map((r) => (
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
            onDuplicate={() => handleDuplicate(r.recipeId)}
            onDelete={() => handleDelete(r.recipeId, r.summary?.name ?? 'esta receta')}
          />
        ))}
      </div>
    </div>
  );
}
