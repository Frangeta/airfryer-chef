import { useEffect, useMemo, useState } from 'react';
import { Search, Snowflake, Leaf, Repeat, RotateCw, Star } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import * as repo from '@/services/db';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { FOOD_CATEGORIES } from '@/types';

type SortKey = 'name' | 'tempC' | 'minTimeMin';

export default function Tablas() {
  const { user } = useAuth();
  const [foods, setFoods] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [frozenOnly, setFrozenOnly] = useState(false);
  const [freshOnly, setFreshOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      repo.listFoods({ q: q || undefined, category: category ?? undefined, frozenOnly, freshOnly }),
      repo.listFavoriteFoodIds(user.uid)
    ])
      .then(([f, favs]) => {
        setFoods(f);
        setFavoriteIds(favs);
      })
      .finally(() => setLoading(false));
  }, [user, q, category, frozenOnly, freshOnly]);

  async function toggleFavorite(foodId: string) {
    if (!user) return;
    const isFav = favoriteIds.includes(foodId);
    setFavoriteIds((prev) => (isFav ? prev.filter((id) => id !== foodId) : [...prev, foodId]));
    await repo.toggleFavoriteFood(user.uid, foodId, !isFav);
  }

  const sorted = useMemo(() => {
    let list = foods;
    if (favoritesOnly) list = list.filter((f) => favoriteIds.includes(f.id));
    const copy = [...list];
    copy.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'tempC') return (a.cookingProfile?.tempC ?? 0) - (b.cookingProfile?.tempC ?? 0);
      return (a.cookingProfile?.minTimeMin ?? 0) - (b.cookingProfile?.minTimeMin ?? 0);
    });
    return copy;
  }, [foods, favoriteIds, favoritesOnly, sortKey]);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tabla de tiempos y temperaturas</h1>
        <p className="text-sm text-ink/60 mt-1">Consulta rápida por alimento, para tu Gourmia GAF1180.</p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar alimento…"
            className="w-full rounded-xl border border-black/10 bg-cream/40 pl-9 pr-3.5 py-2.5 text-sm outline-none focus:border-teal-400"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={category === null} onClick={() => setCategory(null)}>
            Todas
          </Chip>
          {FOOD_CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
              {c}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)}>
            <Star className="w-3 h-3 inline mr-1" /> Favoritos
          </Chip>
          <Chip active={frozenOnly} onClick={() => setFrozenOnly((v) => !v)}>
            <Snowflake className="w-3 h-3 inline mr-1" /> Congelados
          </Chip>
          <Chip active={freshOnly} onClick={() => setFreshOnly((v) => !v)}>
            <Leaf className="w-3 h-3 inline mr-1" /> Frescos
          </Chip>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-black/[0.02] text-ink/50 text-xs uppercase tracking-wide">
            <tr>
              <th className="w-8 px-2 py-2.5"></th>
              <th className="text-left px-4 py-2.5 font-medium cursor-pointer" onClick={() => setSortKey('name')}>
                Alimento
              </th>
              <th className="text-left px-4 py-2.5 font-medium cursor-pointer" onClick={() => setSortKey('tempC')}>
                Temp.
              </th>
              <th className="text-left px-4 py-2.5 font-medium cursor-pointer" onClick={() => setSortKey('minTimeMin')}>
                Tiempo
              </th>
              <th className="text-left px-4 py-2.5 font-medium">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => {
              const isFav = favoriteIds.includes(f.id);
              return (
                <tr key={f.id} className="border-t border-black/5 align-top">
                  <td className="px-2 py-3">
                    <button
                      onClick={() => toggleFavorite(f.id)}
                      aria-label={isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}
                      className={isFav ? 'text-gold-500' : 'text-ink/20 hover:text-gold-400'}
                    >
                      <Star className="w-4 h-4" fill={isFav ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink/85">{f.name}</div>
                    <div className="text-xs text-ink/40">{f.category}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-ink/70">{f.cookingProfile ? `${f.cookingProfile.tempC} ºC` : '—'}</td>
                  <td className="px-4 py-3 font-mono text-ink/70">
                    {f.cookingProfile ? `${f.cookingProfile.minTimeMin}-${f.cookingProfile.maxTimeMin} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/55 space-y-1">
                    {f.cookingProfile?.requiresShaking && (
                      <div className="flex items-center gap-1">
                        <Repeat className="w-3 h-3" /> Agitar a mitad de cocción
                      </div>
                    )}
                    {f.cookingProfile?.requiresFlipping && (
                      <div className="flex items-center gap-1">
                        <RotateCw className="w-3 h-3" /> Dar la vuelta a mitad de cocción
                      </div>
                    )}
                    {f.canCookFrozen && <div>Apto congelado</div>}
                    {f.isRawProtein && f.safeInternalTempC && <div>Temp. interna segura: {f.safeInternalTempC} ºC</div>}
                    {f.recommendedQuantity && <div>{f.recommendedQuantity}</div>}
                    {f.notes && <div className="text-ink/45">{f.notes}</div>}
                  </td>
                </tr>
              );
            })}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink/40">
                  No hay alimentos que coincidan con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
