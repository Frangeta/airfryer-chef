import { ChefHat, LogIn, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isOwner, login, logout } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink/40 text-sm">Cargando…</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center">
        <ChefHat className="w-10 h-10 text-paprika-500" />
        <div>
          <h1 className="text-xl font-semibold">Air Fryer Chef</h1>
          <p className="text-sm text-ink/55 mt-1">Inicia sesión para entrar a tu cocina.</p>
        </div>
        <button
          onClick={login}
          className="flex items-center gap-2 rounded-xl bg-paprika-500 hover:bg-paprika-600 text-white text-sm font-medium px-5 py-2.5 shadow-card"
        >
          <LogIn className="w-4 h-4" /> Iniciar sesión con Google
        </button>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="w-10 h-10 text-warn" />
        <div>
          <h1 className="text-lg font-semibold">Acceso restringido</h1>
          <p className="text-sm text-ink/55 mt-1 max-w-sm">
            Esta es una cocina personal — solo la cuenta configurada como propietaria puede entrar.
          </p>
        </div>
        <button onClick={logout} className="text-sm text-paprika-600 hover:underline">
          Probar con otra cuenta
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
