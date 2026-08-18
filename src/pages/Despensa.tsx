import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import * as repo from '@/services/db';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const STATUS_LABEL: Record<string, string> = { DISPONIBLE: 'Disponible', POCO: 'Poco', AGOTADO: 'Agotado' };
const STATUS_STYLE: Record<string, string> = {
  DISPONIBLE: 'bg-gold-100 text-gold-600',
  POCO: 'bg-basket1-light text-basket1-dark',
  AGOTADO: 'bg-black/[0.06] text-ink/40'
};

export default function Despensa() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Básicos');
  const [loading, setLoading] = useState(true);

  function load() {
    if (!user) return;
    repo.listPantry(user.uid).then((i) => {
      setItems(i);
      setLoading(false);
    });
  }

  useEffect(load, [user]);

  async function addItem() {
    if (!user || !name.trim()) return;
    const id = await repo.upsertPantryItem(user.uid, name.trim(), category);
    setItems((prev) => [...prev.filter((i) => i.id !== id), { id, name: name.trim(), category, status: 'DISPONIBLE' }]);
    setName('');
  }

  async function cycleStatus(item: any) {
    if (!user) return;
    const order = ['DISPONIBLE', 'POCO', 'AGOTADO'];
    const next = order[(order.indexOf(item.status) + 1) % order.length];
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
    await repo.updatePantryStatus(user.uid, item.id, next);
  }

  async function removeItem(id: string) {
    if (!user) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    await repo.deletePantryItem(user.uid, id);
  }

  const grouped = items.reduce<Record<string, any[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mi despensa</h1>
        <p className="text-sm text-ink/60 mt-1">
          Lo que marques aquí como disponible se prioriza al generar recetas con la IA.
        </p>
      </div>

      <Card className="p-4 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Añadir ingrediente…"
          className="flex-1 min-w-[160px] rounded-xl border border-black/10 px-3.5 py-2.5 text-sm outline-none focus:border-paprika-400"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-black/10 px-2.5 py-2.5 text-sm bg-paper"
        >
          {['Proteínas', 'Verduras', 'Básicos', 'Congelados', 'Lácteos', 'Otros'].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button onClick={addItem}>
          <Plus className="w-4 h-4" /> Añadir
        </Button>
      </Card>

      {!loading && Object.keys(grouped).length === 0 && (
        <p className="text-sm text-ink/40 text-center py-8">Tu despensa está vacía. Añade lo que tengas en casa.</p>
      )}

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="space-y-2">
          <h2 className="text-sm font-semibold text-ink/70">{cat}</h2>
          <Card className="divide-y divide-black/5">
            {catItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-ink/80">{item.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cycleStatus(item)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${STATUS_STYLE[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </button>
                  <button onClick={() => removeItem(item.id)} aria-label="Eliminar" className="text-ink/30 hover:text-warn">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}
