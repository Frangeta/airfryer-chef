/**
 * Algoritmo de sincronización de doble cesta.
 * ----------------------------------------------------------------------------
 * Objetivo: dados uno o dos alimentos con su temperatura y tiempo de cocción
 * (potencialmente distintos), calcular en qué instante debe introducirse cada
 * uno para que ambos terminen aproximadamente a la vez, usando una única
 * línea de tiempo global T0 → Tfin.
 *
 * Regla física: el alimento que necesita MÁS tiempo se introduce primero (en
 * T0). El alimento que necesita MENOS tiempo se introduce más tarde, cuando al
 * primero le queda exactamente su propio tiempo de cocción por delante. Así
 * ambos terminan en el mismo instante global.
 *
 * Si la diferencia entre ambos tiempos es pequeña (<= STAGGER_THRESHOLD_MIN),
 * no merece la pena escalonar el inicio: se recomienda introducir las dos
 * cestas a la vez (el margen de error de cualquier Air Fryer doméstica ya es
 * de ese orden).
 */

export type BasketZone = 'CESTA_1' | 'CESTA_2';

export interface ZoneCookInput {
  zone: BasketZone;
  foodLabel: string;
  tempC: number;
  timeMin: number;
  requiresShaking?: boolean;
  shakeAtMinute?: number; // minuto relativo al inicio de ESA cesta; por defecto, la mitad del tiempo
  requiresFlipping?: boolean;
  flipAtMinute?: number;
  requiresPreheat?: boolean;
  program?: string;
}

export interface ZoneCheckpoint {
  atGlobalMinute: number;
  atZoneMinute: number;
  action: 'AGITAR' | 'VOLTEAR';
}

export interface SyncedZonePlan extends ZoneCookInput {
  startOffsetMin: number;
  endOffsetMin: number;
  checkpoints: ZoneCheckpoint[];
}

export interface DualBasketPlan {
  globalTotalMin: number;
  startTogether: boolean;
  needsPreheat: boolean;
  zones: SyncedZonePlan[];
  instructions: string[];
}

export const STAGGER_THRESHOLD_MIN = 2;

export function synchronizeDualBasket(inputs: ZoneCookInput[]): DualBasketPlan {
  if (inputs.length === 0) {
    throw new Error('Se necesita al menos una cesta con datos de cocción.');
  }
  if (inputs.length > 2) {
    throw new Error('Este modelo de Air Fryer solo soporta 2 cestas simultáneas.');
  }

  const needsPreheat = inputs.some((z) => z.requiresPreheat);

  if (inputs.length === 1) {
    const only = inputs[0];
    const zone: SyncedZonePlan = {
      ...only,
      startOffsetMin: 0,
      endOffsetMin: only.timeMin,
      checkpoints: buildCheckpoints(only, 0)
    };
    return {
      globalTotalMin: only.timeMin,
      startTogether: true,
      needsPreheat,
      zones: [zone],
      instructions: [
        `${labelZone(only.zone)}: ${only.foodLabel} a ${only.tempC} ºC durante ${only.timeMin} min.`,
        ...checkpointInstructions([zone])
      ]
    };
  }

  const [first, second] = inputs;
  const globalTotalMin = Math.max(first.timeMin, second.timeMin);
  const diff = Math.abs(first.timeMin - second.timeMin);
  const startTogether = diff <= STAGGER_THRESHOLD_MIN;

  const longer = first.timeMin >= second.timeMin ? first : second;
  const shorter = first.timeMin >= second.timeMin ? second : first;

  const offsetByZone: Record<BasketZone, number> = {
    CESTA_1: 0,
    CESTA_2: 0
  };
  offsetByZone[longer.zone] = 0;
  offsetByZone[shorter.zone] = startTogether ? 0 : diff;

  const zones: SyncedZonePlan[] = inputs.map((z) => {
    const startOffsetMin = offsetByZone[z.zone];
    return {
      ...z,
      startOffsetMin,
      endOffsetMin: startOffsetMin + z.timeMin,
      checkpoints: buildCheckpoints(z, startOffsetMin)
    };
  });

  const instructions: string[] = [];
  if (needsPreheat) {
    instructions.push('Precalienta la Air Fryer antes de introducir cualquier alimento.');
  }
  if (startTogether) {
    instructions.push(
      `Introduce las dos cestas a la vez — ${longer.foodLabel} (${labelZone(longer.zone)}, ${longer.tempC} ºC) ` +
        `y ${shorter.foodLabel} (${labelZone(shorter.zone)}, ${shorter.tempC} ºC). Ambas terminan a los ${globalTotalMin} min.`
    );
  } else {
    instructions.push(
      `Empieza con ${longer.foodLabel} en ${labelZone(longer.zone)} a ${longer.tempC} ºC (tiempo total: ${longer.timeMin} min).`
    );
    instructions.push(
      `A los ${diff} min de empezar (cuando a ${longer.foodLabel} le queden ${shorter.timeMin} min), introduce ` +
        `${shorter.foodLabel} en ${labelZone(shorter.zone)} a ${shorter.tempC} ºC.`
    );
    instructions.push(`Ambos alimentos estarán listos a la vez, a los ${globalTotalMin} min desde el inicio.`);
  }
  instructions.push(...checkpointInstructions(zones));

  return { globalTotalMin, startTogether, needsPreheat, zones, instructions };
}

function buildCheckpoints(z: ZoneCookInput, startOffsetMin: number): ZoneCheckpoint[] {
  const checkpoints: ZoneCheckpoint[] = [];
  if (z.requiresShaking) {
    const atZoneMinute = clampToRange(z.shakeAtMinute ?? Math.round(z.timeMin / 2), z.timeMin);
    checkpoints.push({ atZoneMinute, atGlobalMinute: startOffsetMin + atZoneMinute, action: 'AGITAR' });
  }
  if (z.requiresFlipping) {
    const atZoneMinute = clampToRange(z.flipAtMinute ?? Math.round(z.timeMin / 2), z.timeMin);
    checkpoints.push({ atZoneMinute, atGlobalMinute: startOffsetMin + atZoneMinute, action: 'VOLTEAR' });
  }
  return checkpoints.sort((a, b) => a.atGlobalMinute - b.atGlobalMinute);
}

function clampToRange(minute: number, totalTime: number): number {
  return Math.min(Math.max(minute, 1), Math.max(totalTime - 1, 1));
}

function checkpointInstructions(zones: SyncedZonePlan[]): string[] {
  return zones
    .flatMap((z) =>
      z.checkpoints.map(
        (c) =>
          `${labelZone(z.zone)}: a los ${c.atGlobalMinute} min desde el inicio global (${c.atZoneMinute} min de ${z.foodLabel}), ` +
          `${c.action === 'AGITAR' ? 'agita' : 'dale la vuelta a'} ${z.foodLabel}.`
      )
    )
    .sort();
}

function labelZone(zone: BasketZone): string {
  return zone === 'CESTA_1' ? 'Cesta 1' : 'Cesta 2';
}
