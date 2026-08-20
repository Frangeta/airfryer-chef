
import { Clock, Flame, Users, ChefHat, AlertTriangle, Layers, Copy, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge, DifficultyBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface RecipeCardData {
  id?: string;
  name: string;
  description: string;
  difficulty: string;
  totalTimeMin: number;
  airFryerTimeMin: number;
  servingsBase: number;
  isDualZone: boolean;
  matchPercentage?: number;
  missingIngredients?: string[];
  needsReview?: boolean;
  isFavorite?: boolean;
}

export function RecipeCard({
  recipe,
  onView,
  onSave,
  onFavoriteToggle,
  onLike,
  onDislike,
  onDuplicate,
  onDelete,
  saving
}: {
  recipe: RecipeCardData;
  onView?: () => void;
  onSave?: () => void;
  onFavoriteToggle?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  saving?: boolean;
}) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-lg leading-snug text-ink">{recipe.name}</h3>
        {recipe.matchPercentage !== undefined && (
          <Badge variant={recipe.matchPercentage >= 80 ? 'gold' : 'neutral'} className="shrink-0">
            {recipe.matchPercentage}% con lo que tienes
          </Badge>
        )}
      </div>

      <p className="text-sm text-ink/60 line-clamp-2">{recipe.description}</p>

      <div className="flex flex-wrap gap-2">
        <DifficultyBadge difficulty={recipe.difficulty} />
        <Badge variant="neutral">
          <Clock className="w-3 h-3" /> {recipe.totalTimeMin} min
        </Badge>
        <Badge variant="neutral">
          <Flame className="w-3 h-3" /> {recipe.airFryerTimeMin} min AF
        </Badge>
        <Badge variant="neutral">
          <Users className="w-3 h-3" /> {recipe.servingsBase}
        </Badge>
        {recipe.isDualZone && (
          <Badge variant="teal">
            <Layers className="w-3 h-3" /> Doble cesta
          </Badge>
        )}
        {recipe.needsReview && (
          <Badge variant="warn">
            <AlertTriangle className="w-3 h-3" /> Revisar antes de guardar
          </Badge>
        )}
      </div>

      {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
        <p className="text-xs text-ink/50">
          Te falta: <span className="text-ink/70">{recipe.missingIngredients.join(', ')}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {onView && (
          <Button variant="secondary" size="sm" onClick={onView}>
            <ChefHat className="w-3.5 h-3.5" /> Ver receta
          </Button>
        )}
        {onSave && (
          <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        )}
        {onFavoriteToggle && (
          <Button variant="ghost" size="sm" onClick={onFavoriteToggle}>
            {recipe.isFavorite ? '❤️ Favorita' : '🤍 Favorita'}
          </Button>
        )}
        {onLike && (
          <Button variant="ghost" size="sm" onClick={onLike} aria-label="Me gusta">
            👍
          </Button>
        )}
        {onDislike && (
          <Button variant="ghost" size="sm" onClick={onDislike} aria-label="No me gusta">
            👎
          </Button>
        )}
        {onDuplicate && (
          <Button variant="ghost" size="sm" onClick={onDuplicate} aria-label="Duplicar">
            <Copy className="w-3.5 h-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Eliminar" className="text-warn hover:bg-warn/10">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}
