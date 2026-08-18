
import { Repeat, RotateCw } from 'lucide-react';

export interface TimelineZone {
  zone: 'CESTA_1' | 'CESTA_2';
  foodLabel: string;
  tempC: number;
  timeMin: number;
  startOffsetMin: number;
  checkpoints?: { atGlobalMinute: number; action: 'AGITAR' | 'VOLTEAR' }[];
}

export function DualBasketTimeline({
  zones,
  globalTotalMin,
  startTogether
}: {
  zones: TimelineZone[];
  globalTotalMin: number;
  startTogether: boolean;
}) {
  const colors: Record<string, { track: string; bar: string; text: string }> = {
    CESTA_1: { track: 'bg-basket1-light', bar: 'bg-basket1-DEFAULT', text: 'text-basket1-dark' },
    CESTA_2: { track: 'bg-basket2-light', bar: 'bg-basket2-DEFAULT', text: 'text-basket2-dark' }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-ink/50">
        <span>Minuto 0</span>
        <span>
          {startTogether ? 'Ambas cestas empiezan juntas' : 'Inicio escalonado'} · termina a los {globalTotalMin} min
        </span>
      </div>

      {zones.map((z) => {
        const c = colors[z.zone];
        const leftPct = (z.startOffsetMin / globalTotalMin) * 100;
        const widthPct = (z.timeMin / globalTotalMin) * 100;
        return (
          <div key={z.zone} className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className={`text-sm font-medium ${c.text}`}>
                {z.zone === 'CESTA_1' ? 'Cesta 1' : 'Cesta 2'} · {z.foodLabel}
              </span>
              <span className="text-xs text-ink/50 font-mono">
                {z.tempC} ºC · {z.timeMin} min
              </span>
            </div>
            <div className={`relative h-9 rounded-lg ${c.track} overflow-hidden`}>
              <div
                className={`absolute inset-y-0 ${c.bar} rounded-lg flex items-center px-2`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              >
                {z.startOffsetMin > 0 && (
                  <span className="text-[11px] text-white/90 font-mono whitespace-nowrap">
                    +{z.startOffsetMin} min
                  </span>
                )}
              </div>
              {z.checkpoints?.map((cp, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex items-center"
                  style={{ left: `${(cp.atGlobalMinute / globalTotalMin) * 100}%` }}
                  title={`${cp.action === 'AGITAR' ? 'Agitar' : 'Dar la vuelta'} a los ${cp.atGlobalMinute} min`}
                >
                  <div className="w-5 h-5 -ml-2.5 rounded-full bg-white shadow flex items-center justify-center">
                    {cp.action === 'AGITAR' ? (
                      <Repeat className="w-3 h-3 text-ink/70" strokeWidth={2.5} />
                    ) : (
                      <RotateCw className="w-3 h-3 text-ink/70" strokeWidth={2.5} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex justify-between text-[11px] text-ink/40 font-mono px-0.5">
        <span>0 min</span>
        <span>{globalTotalMin} min</span>
      </div>
    </div>
  );
}
