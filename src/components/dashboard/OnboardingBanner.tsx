import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Compass } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import { Card } from '@/components/ui/Card';
import { GUIDE_ITEMS, VARIANT_STYLES } from '@/components/help/guideContent';

function storageKey(uid: string) {
  return `af_onboarding_dismissed_${uid}`;
}

export function OnboardingBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) return;
    setDismissed(localStorage.getItem(storageKey(user.uid)) === '1');
  }, [user]);

  function dismiss() {
    if (!user) return;
    localStorage.setItem(storageKey(user.uid), '1');
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <Card className="p-5 space-y-4 border border-paprika-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-paprika-500" />
          <h2 className="text-sm font-semibold text-ink/80">Un vistazo rápido a la app</h2>
        </div>
        <button onClick={dismiss} aria-label="Cerrar" className="text-ink/30 hover:text-ink/60">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {GUIDE_ITEMS.slice(0, 6).map(({ icon: Icon, title, description, variant }) => (
          <div key={title} className="flex items-start gap-2.5">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${VARIANT_STYLES[variant]}`}>
              <Icon className="w-3.5 h-3.5" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink/80 leading-tight">{title}</p>
              <p className="text-xs text-ink/50 mt-0.5 leading-snug">{description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <Link to="/ayuda" className="text-xs text-paprika-600 hover:underline">
          Ver la guía completa →
        </Link>
        <button onClick={dismiss} className="text-xs text-ink/40 hover:underline">
          Entendido, no volver a mostrar
        </button>
      </div>
    </Card>
  );
}
