import { useState } from 'react';
import { Clock3, Database, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import { initAccessDoc } from '@/services/db';
import { Button } from '@/components/ui/Button';
import { BasketMark } from '@/components/ui/BasketMark';
import { GoogleIcon } from '@/components/ui/GoogleIcon';

/**
 * Envoltorio compartido por las cuatro pantallas de acceso (cargando,
 * entrar, inicializar, pendiente): el mismo fondo con las dos manchas de
 * color (ámbar/verde, los tonos de la doble cesta) desenfocadas de fondo,
 * para que la marca de la app aparezca antes incluso de entrar.
 */
function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-6">
      <div className="absolute -top-28 -left-24 w-80 h-80 rounded-full bg-basket1/25 blur-3xl" aria-hidden="true" />
      <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-basket2/25 blur-3xl" aria-hidden="true" />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, status, login, logout, refreshAccess } = useAuth();
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BasketMark className="w-8 h-8 animate-pulse" />
      </div>
    );
  }

  if (status === 'signed-out') {
    return (
      <GateShell>
        <div className="flex flex-col items-center gap-6 text-center">
          <BasketMark className="w-16 h-16" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Chefryer</h1>
            <p className="text-sm text-ink/55 mt-1.5">Entra para ver qué cocinamos hoy.</p>
          </div>
          <button
            onClick={login}
            className="flex items-center gap-2.5 rounded-xl bg-paper border border-black/10 hover:border-black/20 hover:shadow-card text-ink text-sm font-medium pl-4 pr-5 py-2.5 transition-all"
          >
            <GoogleIcon className="w-4 h-4" /> Continuar con Google
          </button>
        </div>
      </GateShell>
    );
  }

  if (status === 'no-access-doc') {
    async function handleInit() {
      if (!user) return;
      setInitializing(true);
      setInitError(null);
      try {
        await initAccessDoc(user.uid, user.displayName ?? '', user.email ?? '');
        await refreshAccess();
      } catch {
        setInitError('Solo la cuenta administradora original puede inicializar el control de acceso.');
      } finally {
        setInitializing(false);
      }
    }

    return (
      <GateShell>
        <div className="flex flex-col items-center gap-4 text-center bg-paper/90 backdrop-blur rounded-2xl shadow-pop px-6 py-8">
          <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
            <Database className="w-6 h-6 text-teal-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Configurar control de acceso</h1>
            <p className="text-sm text-ink/55 mt-1.5">
              Es la primera vez que se usa esta app. Pulsa el botón para inicializar la lista de acceso con tu cuenta.
            </p>
          </div>
          <Button onClick={handleInit} disabled={initializing}>
            {initializing ? 'Inicializando…' : 'Inicializar acceso'}
          </Button>
          {initError && <p className="text-xs text-warn">{initError}</p>}
          <button onClick={logout} className="text-xs text-ink/40 hover:underline">
            Cerrar sesión
          </button>
        </div>
      </GateShell>
    );
  }

  if (status === 'pending') {
    async function handleRecheck() {
      setChecking(true);
      await refreshAccess();
      setChecking(false);
    }

    return (
      <GateShell>
        <div className="flex flex-col items-center gap-4 text-center bg-paper/90 backdrop-blur rounded-2xl shadow-pop px-6 py-8">
          <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center">
            <Clock3 className="w-6 h-6 text-gold-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Solicitud enviada</h1>
            <p className="text-sm text-ink/55 mt-1.5">
              Tu acceso está pendiente de aprobación. En cuanto alguien con acceso lo confirme, vuelve a entrar aquí.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRecheck} disabled={checking}>
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} /> Comprobar de nuevo
            </Button>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </Button>
          </div>
        </div>
      </GateShell>
    );
  }

  return <>{children}</>;
}
