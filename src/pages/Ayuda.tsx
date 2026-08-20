import { BasketMark } from '@/components/ui/BasketMark';
import { Card } from '@/components/ui/Card';
import { GUIDE_ITEMS, VARIANT_STYLES } from '@/components/help/guideContent';

export default function Ayuda() {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <BasketMark className="w-10 h-10" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cómo funciona Chefryer</h1>
          <p className="text-sm text-ink/60 mt-0.5">Un repaso rápido a cada sección de la app.</p>
        </div>
      </div>

      <div className="space-y-3">
        {GUIDE_ITEMS.map(({ icon: Icon, title, description, variant }) => (
          <Card key={title} className="p-4 flex items-start gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${VARIANT_STYLES[variant]}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink/85">{title}</h2>
              <p className="text-sm text-ink/55 mt-0.5">{description}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5 space-y-2">
        <h2 className="text-sm font-semibold text-ink/80">Un consejo para empezar</h2>
        <p className="text-sm text-ink/60">
          Ve primero a <strong>Mi despensa</strong> y marca lo que tengas ahora mismo en casa. Cuando pidas una receta en
          el <strong>Chef IA</strong>, las tendrá en cuenta automáticamente y te dirá qué porcentaje de ingredientes ya
          tienes.
        </p>
      </Card>

      <Card className="p-5 space-y-2">
        <h2 className="text-sm font-semibold text-ink/80">Instalar en el móvil o la tablet</h2>
        <p className="text-sm text-ink/60">
          <strong>Android / Chrome:</strong> abre el menú (⋮) y toca "Añadir a pantalla de inicio" o "Instalar app" — a
          veces Chrome te lo sugiere solo.
        </p>
        <p className="text-sm text-ink/60">
          <strong>iPhone / iPad (Safari):</strong> toca el icono de compartir <span aria-hidden="true">⬆️</span> y elige
          "Añadir a pantalla de inicio". Safari no ofrece este aviso automáticamente, hay que hacerlo así.
        </p>
        <p className="text-xs text-ink/40">Una vez instalada, abre como cualquier otra app, sin la barra del navegador.</p>
      </Card>
    </div>
  );
}
