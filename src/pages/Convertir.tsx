import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Loader2, ThermometerSun, Clock, Layers, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import { buildAIContextForUser } from '@/services/recipeGeneration';
import * as aiClient from '@/services/aiClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function Convertir() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  async function handleConvert() {
    if (!text.trim() || !user) {
      setError('Pega o escribe la receta tradicional que quieres adaptar.');
      return;
    }
    setLoading(true);
    setError(null);
    setWarning(null);
    setResult(null);
    try {
      const context = await buildAIContextForUser(user.uid, { userRequest: 'Conversión a Air Fryer' });
      const { converted } = await aiClient.convertToAirFryer({ traditionalRecipeText: text, context });
      setResult(converted);
      if (converted.recommended_temp_c > context.air_fryer.max_temp_c) {
        setWarning(
          `La conversión sugiere ${converted.recommended_temp_c} ºC, por encima del máximo de tu Air Fryer (${context.air_fryer.max_temp_c} ºC). Se recomienda no superar el máximo del fabricante.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0 py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-paprika-500" /> Convertir receta a Air Fryer
        </h1>
        <p className="text-sm text-ink/60 mt-1">Pega una receta tradicional (horno, sartén…) y te digo cómo adaptarla a tu Gourmia.</p>
      </div>

      <Card className="p-5 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Ej. "Pollo al horno a 200 ºC durante 40 minutos, con patatas alrededor."'
          rows={5}
          className="w-full rounded-xl border border-black/10 bg-cream/40 px-3.5 py-2.5 text-sm outline-none focus:border-paprika-400 resize-none"
        />
        {error && <p className="text-sm text-warn">{error}</p>}
        <Button onClick={handleConvert} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Convirtiendo…
            </>
          ) : (
            'Convertir a Air Fryer'
          )}
        </Button>
      </Card>

      {result && (
        <Card className="p-5 space-y-4">
          <p className="text-sm text-ink/60 italic">"{result.original_summary}"</p>
          {warning && (
            <div className="flex gap-2 items-start bg-warn/5 rounded-lg p-3 text-sm text-warn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {warning}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="paprika">
              <ThermometerSun className="w-3 h-3" /> {result.recommended_temp_c} ºC
            </Badge>
            <Badge variant="paprika">
              <Clock className="w-3 h-3" /> {result.recommended_time_min} min
            </Badge>
            <Badge variant={result.recommended_zone === 'CUALQUIERA' ? 'neutral' : result.recommended_zone === 'CESTA_1' ? 'basket1' : 'basket2'}>
              <Layers className="w-3 h-3" />
              {result.recommended_zone === 'CUALQUIERA' ? 'Cualquier cesta' : result.recommended_zone.replace('CESTA_', 'Cesta ')}
            </Badge>
            {result.requires_preheat && <Badge variant="neutral">Precalentar</Badge>}
            {result.requires_flipping && <Badge variant="neutral">Dar la vuelta</Badge>}
          </div>
          <p className="text-sm text-ink/70">
            <span className="font-medium">Cantidad máxima:</span> {result.max_quantity_note}
          </p>
          <p className="text-sm text-ink/60 border-t border-black/5 pt-3">{result.explanation}</p>
        </Card>
      )}

      <Link to="/generar" className="text-sm text-paprika-600 hover:underline inline-block">
        ← Volver al Chef IA
      </Link>
    </div>
  );
}
