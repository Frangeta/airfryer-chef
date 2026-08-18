const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

interface ToolDef {
  name: string;
  description: string;
  input_schema: unknown;
}

async function callAnthropic(apiKey: string, body: Record<string, unknown>) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${text}`);
  }
  return res.json() as Promise<{ content: Array<{ type: string; text?: string; input?: unknown }> }>;
}

/** Fuerza a Claude a responder únicamente con la herramienta indicada. */
export async function callForcedTool(params: {
  apiKey: string;
  model: string;
  system: string;
  userContent: string;
  tool: ToolDef;
  maxTokens?: number;
}): Promise<unknown> {
  const data = await callAnthropic(params.apiKey, {
    model: params.model,
    max_tokens: params.maxTokens ?? 2000,
    system: params.system,
    tools: [params.tool],
    tool_choice: { type: 'tool', name: params.tool.name },
    messages: [{ role: 'user', content: params.userContent }]
  });
  const toolUse = data.content.find((b) => b.type === 'tool_use');
  if (!toolUse) throw new Error('La IA no devolvió una respuesta estructurada.');
  return toolUse.input;
}

/** Chat libre: texto + herramienta opcional (tool_choice "auto"). */
export async function callChat(params: {
  apiKey: string;
  model: string;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  tool: ToolDef;
  maxTokens?: number;
}): Promise<{ reply: string; toolInput?: unknown }> {
  const data = await callAnthropic(params.apiKey, {
    model: params.model,
    max_tokens: params.maxTokens ?? 2000,
    system: params.system,
    tools: [params.tool],
    tool_choice: { type: 'auto' },
    messages: params.messages
  });
  const textBlock = data.content.find((b) => b.type === 'text');
  const toolUse = data.content.find((b) => b.type === 'tool_use');
  return { reply: textBlock?.text ?? '', toolInput: toolUse?.input };
}
