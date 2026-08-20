import { Link, useLocation } from 'react-router-dom';
import { House, BookOpen, Sparkles, CookingPot, Table2, Plus, Settings, LogOut, HelpCircle } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import { LogoMark } from '@/components/ui/LogoMark';

const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: House },
  { href: '/recetario', label: 'Recetas', icon: BookOpen },
  { href: '/generar', label: 'Chef IA', icon: Sparkles },
  { href: '/despensa', label: 'Despensa', icon: CookingPot },
  { href: '/tablas', label: 'Tablas', icon: Table2 }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="hidden md:flex items-center justify-between px-8 h-16 border-b border-black/5 bg-paper/70 backdrop-blur sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <LogoMark className="w-6 h-6" />
          Chefryer
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'bg-teal-50 text-teal-600' : 'text-ink/70 hover:bg-black/[0.03] hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/ayuda"
            aria-label="Ayuda"
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
              pathname.startsWith('/ayuda') ? 'bg-teal-50 text-teal-600' : 'text-ink/60 hover:bg-black/[0.04]'
            }`}
          >
            <HelpCircle className="w-[18px] h-[18px]" />
          </Link>
          <Link
            to="/configuracion"
            aria-label="Configuración"
            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
              pathname.startsWith('/configuracion') ? 'bg-teal-50 text-teal-600' : 'text-ink/60 hover:bg-black/[0.04]'
            }`}
          >
            <Settings className="w-[18px] h-[18px]" />
          </Link>
          <button
            onClick={logout}
            aria-label="Cerrar sesión"
            className="flex items-center justify-center w-9 h-9 rounded-xl text-ink/60 hover:bg-black/[0.04]"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
          <Link
            to="/generar"
            className="flex items-center gap-1.5 rounded-xl bg-paprika-500 hover:bg-paprika-600 text-white text-sm font-medium px-4 py-2 transition-colors shadow-card"
          >
            <Plus className="w-4 h-4" /> Nueva receta
          </Link>
        </div>
      </header>

      <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-black/5 bg-paper/70 backdrop-blur sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <LogoMark className="w-5 h-5" />
          Chefryer
        </Link>
        <div className="flex items-center gap-1.5">
          <Link to="/ayuda" aria-label="Ayuda" className="flex items-center justify-center w-9 h-9 rounded-full text-ink/60">
            <HelpCircle className="w-5 h-5" />
          </Link>
          <Link to="/configuracion" aria-label="Configuración" className="flex items-center justify-center w-9 h-9 rounded-full text-ink/60">
            <Settings className="w-5 h-5" />
          </Link>
          <Link
            to="/generar"
            aria-label="Nueva receta"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-paprika-500 text-white shadow-card"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-8">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-paper/95 backdrop-blur border-t border-black/5 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${active ? 'text-teal-600' : 'text-ink/50'}`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
