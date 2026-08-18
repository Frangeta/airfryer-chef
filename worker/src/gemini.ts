const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: unknown };
}
interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
}

async function callGemini(apiKey: string, model: string, body: Record<string, unknown>): Promise<GeminiResponse> {
  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Fuerza una respuesta JSON que cumple `schema` (formato Gemini, ver
 * geminiSchema.ts). Es el equivalente al "tool_choice forzado" que usábamos
 * con Claude, pero usando el modo nativo de salida estructurada de Gemini.
 */
export async function callForcedJson(params: {
  apiKey: string;
  model: string;
  system: string;
  userContent: string;
  schema: unknown;
  maxOutputTokens?: number;
}): Promise<unknown> {
  const data = await callGemini(params.apiKey, params.model, {
    systemInstruction: { parts: [{ text: params.system }] },
    contents: [{ role: 'user', parts: [{ text: params.userContent }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: params.schema,
      maxOutputTokens: params.maxOutputTokens ?? 4096
    }
  });

  const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!text) throw new Error('Gemini no devolvió contenido JSON.');
  return JSON.parse(text);
}

/**
 * Chat libre con una función opcional que Gemini puede invocar cuando
 * considere que ya tiene información suficiente (equivalente a
 * `tool_choice: "auto"` en la versión con Claude).
 */
export async function callChat(params: {
  apiKey: string;
  model: string;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  functionName: string;
  functionDescription: string;
  functionSchema: unknown;
  maxOutputTokens?: number;
}): Promise<{ reply: string; functionArgs?: unknown }> {
  const data = await callGemini(params.apiKey, params.model, {
    systemInstruction: { parts: [{ text: params.system }] },
    contents: params.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    tools: [
      {
        functionDeclarations: [
          { name: params.functionName, description: params.functionDescription, parameters: params.functionSchema }
        ]
      }
    ],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
    generationConfig: { maxOutputTokens: params.maxOutputTokens ?? 2000 }
  });

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const textPart = parts.find((p) => typeof p.text === 'string');
  const functionCallPart = parts.find((p) => p.functionCall);

  return {
    reply: textPart?.text ?? '',
    functionArgs: functionCallPart?.functionCall?.args
  };
}
