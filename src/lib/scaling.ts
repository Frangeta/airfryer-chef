/**
 * Escala cantidades de ingredientes de `servingsBase` a `targetServings`,
 * redondeando de forma "de cocina" en vez de mostrar decimales imposibles:
 * - Gramos/mililitros: redondeo a múltiplos de 5 (o 10 si son cantidades grandes).
 * - Unidades enteras (huevos, dientes de ajo...): redondeo hacia arriba a la
 *   unidad más cercana que tenga sentido culinario (nunca "2.3 huevos").
 * - Cucharadas/cucharaditas/pizcas: redondeo a cuartos (0.25) para permitir
 *   "1 1/4 cucharadita" en vez de solo enteros.
 */

const WHOLE_UNIT_TYPES = new Set(['ud', 'unidad', 'unidades', 'diente', 'dientes']);
const QUARTER_ROUND_UNITS = new Set(['cucharada', 'cucharadita', 'pizca']);

export function scaleQuantity(quantity: number, baseServings: number, targetServings: number, unit: string): number {
  if (baseServings <= 0) return quantity;
  const raw = (quantity * targetServings) / baseServings;
  const normalizedUnit = unit.toLowerCase();

  if (WHOLE_UNIT_TYPES.has(normalizedUnit)) {
    return Math.max(1, Math.round(raw));
  }
  if (QUARTER_ROUND_UNITS.has(normalizedUnit)) {
    return Math.max(0.25, Math.round(raw * 4) / 4);
  }
  if (normalizedUnit === 'g' || normalizedUnit === 'ml') {
    const step = raw > 200 ? 10 : 5;
    return Math.max(step, Math.round(raw / step) * step);
  }
  // kg, l u otras unidades: dos decimales
  return Math.round(raw * 100) / 100;
}

export function formatQuantity(quantity: number): string {
  if (Number.isInteger(quantity)) return String(quantity);
  // Fracciones de cocina legibles para cuartos de cucharadita, etc.
  const fraction = quantity % 1;
  const whole = Math.floor(quantity);
  const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };
  const key = fraction.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') as string;
  const label = FRACTIONS[fraction.toString()] ?? FRACTIONS[key] ?? fraction.toFixed(2);
  return whole > 0 ? `${whole} ${label}` : label;
}
