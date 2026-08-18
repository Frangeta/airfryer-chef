/**
 * Reglas básicas de seguridad alimentaria.
 * ----------------------------------------------------------------------------
 * Principio clave (requisito del producto): la app NUNCA debe afirmar que un
 * alimento es seguro solo porque se ha cocinado X minutos a Y grados en la
 * Air Fryer. El tiempo/temperatura de la Air Fryer es una GUÍA de cocción,
 * no una garantía de seguridad: el hornillo de aire varía según el tamaño de
 * las piezas, la carga de la cesta y el modelo concreto.
 *
 * Por eso, para proteínas crudas de riesgo, siempre se añade una nota que
 * remite a la temperatura interna segura (idealmente verificada con un
 * termómetro de cocina), en vez de basarse solo en el temporizador.
 *
 * Las cifras siguen recomendaciones generales de seguridad alimentaria
 * (tipo USDA/EFSA) con fines orientativos domésticos. No sustituyen a un
 * termómetro de cocina ni a la normativa sanitaria de cada país.
 */

import type { FoodCategory } from '@/types';

export interface SafeInternalTempGuidance {
  category: FoodCategory;
  safeInternalTempC: number;
  note: string;
}

export const SAFE_INTERNAL_TEMPS: Partial<Record<FoodCategory, SafeInternalTempGuidance>> = {
  Pollo: {
    category: 'Pollo',
    safeInternalTempC: 74,
    note:
      'El pollo (entero, piezas o picado) debe alcanzar 74 ºC en su parte más gruesa, sin zonas rosadas ni jugos rojos. Verifica con termómetro si tienes uno; el tiempo del temporizador es solo una guía.'
  },
  Cerdo: {
    category: 'Cerdo',
    safeInternalTempC: 71,
    note:
      'El cerdo, especialmente picado o en preparaciones rellenas, debe alcanzar al menos 71 ºC. Los cortes enteros pueden quedar ligeramente rosados si superan 63 ºC con reposo, pero para uso doméstico se recomienda 71 ºC si hay dudas.'
  },
  Ternera: {
    category: 'Ternera',
    safeInternalTempC: 63,
    note:
      'Los cortes enteros de ternera son seguros a partir de 63 ºC (pueden quedar rosados). La carne picada de ternera, en cambio, debe alcanzar 71 ºC porque el picado distribuye posibles bacterias por toda la pieza.'
  },
  Pescado: {
    category: 'Pescado',
    safeInternalTempC: 63,
    note:
      'El pescado está listo cuando alcanza 63 ºC o se separa fácilmente en lascas con un tenedor y pierde su aspecto translúcido.'
  },
  Marisco: {
    category: 'Marisco',
    safeInternalTempC: 63,
    note: 'El marisco debe quedar opaco y firme; las gambas y similares deben perder su tono translúcido/grisáceo.'
  },
  Huevos: {
    category: 'Huevos',
    safeInternalTempC: 71,
    note:
      'Para personas vulnerables (embarazo, infancia, personas mayores o inmunodeprimidas), cocina hasta que la yema y la clara estén completamente cuajadas.'
  }
};

const GROUND_MEAT_KEYWORDS = ['picad', 'picada', 'picado', 'hamburguesa', 'albóndiga', 'meatball'];

/**
 * Devuelve la nota de seguridad aplicable a un alimento. Si el nombre indica
 * que es carne picada, se prioriza siempre el umbral más exigente (71 ºC)
 * aunque la categoría general (p.ej. Ternera) tenga un umbral menor para
 * piezas enteras.
 */
export function getSafetyNote(category: FoodCategory, foodName: string, isRawProtein: boolean): string | null {
  if (!isRawProtein) return null;

  const isGround = GROUND_MEAT_KEYWORDS.some((k) => foodName.toLowerCase().includes(k));
  if (isGround && (category === 'Ternera' || category === 'Cerdo')) {
    return SAFE_INTERNAL_TEMPS['Cerdo']!.note.includes('71')
      ? 'La carne picada debe alcanzar 71 ºC en el centro de la pieza (hamburguesas, albóndigas...), ya que el picado distribuye posibles bacterias por toda la masa. Verifica con termómetro si es posible.'
      : null;
  }

  const guidance = SAFE_INTERNAL_TEMPS[category];
  return guidance?.note ?? null;
}

export const GENERIC_SAFETY_DISCLAIMER =
  'Esta app ofrece tiempos y temperaturas orientativos para Air Fryer. Para proteínas animales, la seguridad depende de la temperatura interna alcanzada, no solo del temporizador: usa un termómetro de cocina siempre que puedas, especialmente con piezas grandes o congeladas.';
