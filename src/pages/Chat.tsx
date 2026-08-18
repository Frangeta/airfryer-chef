import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Send, Loader2, ChefHat } from 'lucide-react';
import { useAuth } from '@/lib/firebase/AuthProvider';
import * as repo from '@/services/db';
import { buildAIContextForUser } from '@/services/recipeGeneration';
import * as aiClient from '@/services/aiClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestedRecipe?: { proposals: any[] };
  savedRecipeId?: string;
  saving?: boolean;
}

const STARTERS = ['Tengo pollo y patatas', 'Quiero algo rápido para 2', 'Se me antoja algo crujiente'];

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hola, soy tu Chef IA. Cuéntame qué tienes por casa o qué te apetece, y vamos afinando la receta juntos.' }
  ]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading || !user) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content }]);
    setLoading(true);
    try {
      let convId = conversationId;
      if (!convId) {
        convId = await repo.createConversation(user.uid, content.slice(0, 60));
        setConversationId(convId);
      }
      await repo.appendMessage(user.uid, convId, 'user', content);

      const history = await repo.listMessages(user.uid, convId);
      const context = await buildAIContextForUser(user.uid, { userRequest: content });
      const { reply, suggestedRecipe } = await aiClient.chat({
        messages: history.map((m: any) => ({ role: m.role, content: m.content })),
        context
      });

      await repo.appendMessage(user.uid, convId, 'assistant', reply, suggestedRecipe ? JSON.stringify(suggestedRecipe) : undefined);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, suggestedRecipe }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', content: e instanceof Error ? e.message : 'Algo ha fallado, inténtalo de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function saveRecipe(messageIndex: number) {
    if (!user) return;
    const msg = messages[messageIndex];
    const recipe = msg.suggestedRecipe?.proposals?.[0];
    if (!recipe) return;
    setMessages((prev) => prev.map((m, i) => (i === messageIndex ? { ...m, saving: true } : m)));
    const userDoc = await repo.getUserDoc(user.uid);
    const created = await repo.persistGeneratedRecipe(recipe, {
      uid: user.uid,
      airFryerModelId: userDoc?.airFryerModelId ?? null,
      saveToRecetario: true
    });
    navigate(`/recetas/${created.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0 py-6 flex flex-col h-[calc(100vh-4.5rem)] md:h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-paprika-500" /> Chef IA · Chat
        </h1>
        <Link to="/generar" className="text-xs text-paprika-600 hover:underline">
          Modo generador rápido
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[85%] space-y-2">
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user' ? 'bg-paprika-500 text-white rounded-br-sm' : 'bg-paper shadow-card rounded-bl-sm text-ink/85'
                }`}
              >
                {m.content}
              </div>
              {m.suggestedRecipe?.proposals?.[0] && (
                <Card className="p-4 space-y-2">
                  <h4 className="font-medium text-sm">{m.suggestedRecipe.proposals[0].name}</h4>
                  <p className="text-xs text-ink/55 line-clamp-2">{m.suggestedRecipe.proposals[0].description}</p>
                  <Button size="sm" onClick={() => saveRecipe(i)} disabled={m.saving}>
                    {m.saving ? 'Guardando…' : 'Guardar como receta'}
                  </Button>
                </Card>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-paper shadow-card rounded-2xl rounded-bl-sm px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-ink/40" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {STARTERS.map((s) => (
            <button key={s} onClick={() => send(s)} className="text-xs rounded-full border border-black/10 px-3 py-1.5 hover:border-paprika-400">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 sticky bottom-0 bg-cream pt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escribe tu mensaje…"
          className="flex-1 rounded-xl border border-black/10 bg-paper px-4 py-2.5 text-sm outline-none focus:border-paprika-400"
        />
        <Button onClick={() => send()} disabled={loading} aria-label="Enviar">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
