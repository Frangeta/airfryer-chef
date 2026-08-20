import { Zap, Leaf, Flame, UtensilsCrossed, Sprout, Recycle, Globe2 } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';

const MOOD_TILES = [
  { label: 'Cena rápida', icon: Zap, variant: 'paprika' },
  { label: 'Cena ligera', icon: Leaf, variant: 'basket2' },
  { label: 'Algo crujiente', icon: Flame, variant: 'gold' },
  { label: 'Algo tipo restaurante', icon: UtensilsCrossed, variant: 'basket1' },
  { label: 'Vegetariano', icon: Sprout, variant: 'basket2' },
  { label: 'Aprovechar sobras', icon: Recycle, variant: 'gold' }
] as const;

const CUISINE_CHIPS = ['Receta mexicana', 'Receta italiana', 'Receta española', 'Receta asiática'];
const FILTER_CHIPS = ['Algo saludable', 'Con pollo', 'Con pescado', 'Menos de 20 minutos'];

const TILE_VARIANTS: Record<string, string> = {
  paprika: 'bg-teal-50 text-teal-600',
  basket1: 'bg-basket1-light text-basket1-dark',
  basket2: 'bg-basket2-light text-basket2-dark',
  gold: 'bg-gold-100 text-gold-600'
};

export function IntentTiles({ active, onSelect }: { active: string; onSelect: (value: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {MOOD_TILES.map(({ label, icon: Icon, variant }) => {
          const isActive = active === label;
          return (
            <button
              key={label}
              onClick={() => onSelect(label)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                isActive ? 'border-teal-400 bg-teal-50/60' : 'border-black/10 hover:border-black/20'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TILE_VARIANTS[variant]}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-sm font-medium text-ink/80 leading-tight">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-ink/40">
          <Globe2 className="w-3.5 h-3.5" /> Cocina del mundo
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CUISINE_CHIPS.map((chip) => (
            <Chip key={chip} active={active === chip} onClick={() => onSelect(chip)}>
              {chip}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-ink/40">Más filtros</p>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_CHIPS.map((chip) => (
            <Chip key={chip} active={active === chip} onClick={() => onSelect(chip)}>
              {chip}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
