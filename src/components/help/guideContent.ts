import { House, BookOpen, Sparkles, CookingPot, Table2, MessageCircle, Layers } from 'lucide-react';

export interface GuideItem {
  icon: typeof House;
  title: string;
  description: string;
  variant: 'paprika' | 'basket1' | 'basket2' | 'gold';
}

export const GUIDE_ITEMS: GuideItem[] = [
  {
    icon: House,
    title: 'Inicio',
    description: 'Tus favoritos, recetas recientes y un acceso directo para generar algo nuevo.',
    variant: 'paprika'
  },
  {
    icon: Sparkles,
    title: 'Chef IA',
    description: 'Dile qué ingredientes tienes o qué te apetece, y te propone recetas listas para tu Air Fryer.',
    variant: 'gold'
  },
  {
    icon: MessageCircle,
    title: 'Chef IA · modo chat',
    description: 'Lo mismo, pero conversando: "no tengo pimentón", "somos 4", "que esté en 20 min"…',
    variant: 'basket2'
  },
  {
    icon: BookOpen,
    title: 'Mi recetario',
    description: 'Todo lo que guardas queda aquí: favoritas, valoradas, con tus propias notas y categorías.',
    variant: 'basket1'
  },
  {
    icon: CookingPot,
    title: 'Mi despensa',
    description: 'Marca lo que tienes en casa — la IA lo prioriza al proponer recetas.',
    variant: 'gold'
  },
  {
    icon: Table2,
    title: 'Tablas',
    description: 'Consulta rápida de tiempo y temperatura para cualquier alimento, sin esperar a la IA.',
    variant: 'basket2'
  },
  {
    icon: Layers,
    title: 'Doble cesta',
    description: 'En las recetas que usan las dos cestas a la vez, te decimos exactamente cuándo meter cada cosa para que terminen juntas.',
    variant: 'paprika'
  }
];

export const VARIANT_STYLES: Record<GuideItem['variant'], string> = {
  paprika: 'bg-paprika-50 text-paprika-600',
  basket1: 'bg-basket1-light text-basket1-dark',
  basket2: 'bg-basket2-light text-basket2-dark',
  gold: 'bg-gold-100 text-gold-600'
};
