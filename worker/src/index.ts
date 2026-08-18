import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import {
  AIContextSchema,
  AIRecipeProposalsSchema,
  AISubstitutionSchema,
  AIConvertedRecipeSchema
} from './types';
import { buildSystemPrompt, buildUserPrompt, buildSubstitutionPrompt, buildConversionPrompt } from './promptBuilder';
import { callForcedJson, callChat } from './gemini';
import { toGeminiSchema } from './geminiSchema';
import { verifyFirebaseIdToken } from './verifyFirebaseToken';

export interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_UID: string;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGIN: string;
  GEMINI_MODEL?: string;
}

const SubstitutionsSchema = z.object({ substitutions: z.array(AISubstitutionSchema).min(1).max(3) });

function schemaFor(schema: z.ZodTypeAny) {
  return toGeminiSchema(zodToJsonSchema(schema, { target: 'openApi3' }));
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Método no permitido.' }, 405, origin);
    }

    // --- Autenticación: el backend solo actúa para el UID configurado ------
    const authHeader = request.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Falta el token de autenticación.' }, 401, origin);

    let uid: string;
    try {
      const verified = await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID);
      uid = verified.uid;
    } catch {
      return json({ error: 'Token inválido o caducado.' }, 401, origin);
    }
    if (uid !== env.ALLOWED_UID) {
      return json({ error: 'Esta clave de IA no está configurada para este usuario.' }, 403, origin);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'JSON inválido.' }, 400, origin);
    }

    const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case '/generate': {
          const context = AIContextSchema.parse(body.context);
          const result = await callForcedJson({
            apiKey: env.GEMINI_API_KEY,
            model,
            system: buildSystemPrompt(),
            userContent: buildUserPrompt(context),
            schema: schemaFor(AIRecipeProposalsSchema),
            maxOutputTokens: 4096
          });
          return json(AIRecipeProposalsSchema.parse(result), 200, origin);
        }

        case '/substitute': {
          const result = await callForcedJson({
            apiKey: env.GEMINI_API_KEY,
            model,
            system: buildSystemPrompt(),
            userContent: buildSubstitutionPrompt({
              missingIngredient: String(body.missingIngredient ?? ''),
              recipeContext: String(body.recipeContext ?? '')
            }),
            schema: schemaFor(SubstitutionsSchema),
            maxOutputTokens: 1200
          });
          return json(SubstitutionsSchema.parse(result), 200, origin);
        }

        case '/convert': {
          const context = AIContextSchema.parse(body.context);
          const result = await callForcedJson({
            apiKey: env.GEMINI_API_KEY,
            model,
            system: buildSystemPrompt(),
            userContent: buildConversionPrompt({
              traditionalRecipeText: String(body.traditionalRecipeText ?? ''),
              maxTempC: context.air_fryer.max_temp_c
            }),
            schema: schemaFor(AIConvertedRecipeSchema),
            maxOutputTokens: 1200
          });
          return json({ converted: AIConvertedRecipeSchema.parse(result) }, 200, origin);
        }

        case '/chat': {
          const context = AIContextSchema.parse(body.context);
          const messages = Array.isArray(body.messages) ? body.messages : [];
          const { reply, functionArgs } = await callChat({
            apiKey: env.GEMINI_API_KEY,
            model,
            system: `${buildSystemPrompt()}\n\nEstás en un chat conversacional: responde de forma breve y natural en texto, y solo llama a la función "propose_recipes" cuando el usuario tenga ya claro qué quiere cocinar.`,
            messages: [
              { role: 'user', content: `Contexto del usuario:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`` },
              ...messages
            ],
            functionName: 'propose_recipes',
            functionDescription: 'Úsala SOLO si ya tienes suficiente información para proponer una receta concreta.',
            functionSchema: schemaFor(AIRecipeProposalsSchema)
          });
          return json(
            { reply, suggestedRecipe: functionArgs ? AIRecipeProposalsSchema.parse(functionArgs) : undefined },
            200,
            origin
          );
        }

        default:
          return json({ error: 'Ruta no encontrada.' }, 404, origin);
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error inesperado en el proxy de IA.';
      return json({ error: message }, 500, origin);
    }
  }
};
