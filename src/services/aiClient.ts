import { auth } from '@/lib/firebase/firebase';
import type { AIContext, AIRecipeProposals, AISubstitution, AIConvertedRecipe } from '@/types';

const PROXY_URL = import.meta.env.VITE_AI_PROXY_URL as string;

async function authedFetch(path: string, body: unknown) {
  if (!PROXY_URL) {
    throw new Error('Falta configurar VITE_AI_PROXY_URL (la URL del Worker que hace de proxy hacia Claude).');
  }
  const user = auth.currentUser;
  if (!user) throw new Error('Tienes que iniciar sesión.');
  const token = await user.getIdToken();

  const res = await fetch(`${PROXY_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error hablando con el Chef IA.');
  return data;
}

export async function generateRecipes(context: AIContext): Promise<AIRecipeProposals> {
  return authedFetch('/generate', { context });
}

export async function suggestSubstitution(params: {
  missingIngredient: string;
  recipeContext: string;
  context: AIContext;
}): Promise<{ substitutions: AISubstitution[] }> {
  return authedFetch('/substitute', params);
}

export async function convertToAirFryer(params: {
  traditionalRecipeText: string;
  context: AIContext;
}): Promise<{ converted: AIConvertedRecipe }> {
  return authedFetch('/convert', params);
}

export async function chat(params: {
  messages: { role: 'user' | 'assistant'; content: string }[];
  context: AIContext;
}): Promise<{ reply: string; suggestedRecipe?: AIRecipeProposals }> {
  return authedFetch('/chat', params);
}
