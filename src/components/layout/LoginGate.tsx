import { useState } from 'react';
import { ChefHat, LogIn, Clock3, Database, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import { initAccessDoc } from '@/services/db';
import { Button } from '@/components/ui/Button';

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, status, login, logout, refreshAccess } = useAuth();
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-ink/40 text-sm">Cargando…</div>;
  }

  if (status === 'signed-out') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
        <ChefHat className="w-10 h-10 text-paprika-500" />
        <div>
          <h1 className="text-xl font-semibold">Air Fryer Chef</h1>
          <p className="text-sm text-ink/55 mt-1">Inicia sesión para entrar a tu cocina.</p>
        </div>
        <Button onClick={login}>
          <LogIn className="w-4 h-4" /> Iniciar sesión con Google
        </Button>
      </div>
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center max-w-sm mx-auto">
        <Database className="w-10 h-10 text-paprika-500" />
        <div>
          <h1 className="text-lg font-semibold">Configurar control de acceso</h1>
          <p className="text-sm text-ink/55 mt-1">
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
    );
  }

  if (status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center max-w-sm mx-auto">
        <Clock3 className="w-10 h-10 text-gold-500" />
        <div>
          <h1 className="text-lg font-semibold">Solicitud enviada</h1>
          <p className="text-sm text-ink/55 mt-1">
            Tu acceso está pendiente de aprobación. En cuanto alguien con acceso lo confirme, vuelve a entrar aquí.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={refreshAccess}>
            Comprobar de nuevo
          </Button>
          <Button variant="ghost" onClick={logout}>
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
