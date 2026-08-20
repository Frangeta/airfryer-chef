import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LogoMark } from '@/components/ui/LogoMark';

export function DashboardPromptBox() {
  const [text, setText] = useState('');
  const navigate = useNavigate();

  function submit() {
    navigate(text.trim() ? `/generar?q=${encodeURIComponent(text.trim())}` : '/generar');
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-6 md:p-8 text-white shadow-pop">
      <LogoMark className="absolute -right-8 -bottom-10 w-44 h-44 opacity-[0.14] rotate-12 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 text-gold-300 text-sm font-medium mb-3">
          <Sparkles className="w-4 h-4" /> Chef IA
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">¿Qué quieres cocinar?</h1>
        <div className="flex flex-col md:flex-row gap-2.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder='"Tengo pollo, patatas y cebolla" · "Cena rápida para 4"…'
            className="flex-1 rounded-xl px-4 py-3 text-ink placeholder:text-ink/40 outline-none bg-white/95 focus:bg-white"
          />
          <Button onClick={submit} variant="warm" className="justify-center">
            Generar <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
