import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/firebase/AuthProvider';
import { LoginGate } from '@/components/layout/LoginGate';
import { AppShell } from '@/components/layout/AppShell';
import Dashboard from '@/pages/Dashboard';
import Generar from '@/pages/Generar';
import RecipeDetail from '@/pages/RecipeDetail';
import Recetario from '@/pages/Recetario';
import Tablas from '@/pages/Tablas';
import Despensa from '@/pages/Despensa';
import Configuracion from '@/pages/Configuracion';
import Chat from '@/pages/Chat';
import Convertir from '@/pages/Convertir';
import Ayuda from '@/pages/Ayuda';

export default function App() {
  return (
    <AuthProvider>
      <LoginGate>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/generar" element={<Generar />} />
            <Route path="/recetas/:id" element={<RecipeDetail />} />
            <Route path="/recetario" element={<Recetario />} />
            <Route path="/tablas" element={<Tablas />} />
            <Route path="/despensa" element={<Despensa />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/convertir" element={<Convertir />} />
            <Route path="/ayuda" element={<Ayuda />} />
          </Routes>
        </AppShell>
      </LoginGate>
    </AuthProvider>
  );
}
