import type { AIContext } from './types';

export function buildSystemPrompt(): string {
  return `Eres el Chef IA de una aplicación de cocina especializada en Air Fryer (freidora de aire).

REGLAS OBLIGATORIAS:
1. Debes responder ÚNICAMENTE usando la herramienta (tool) proporcionada, con datos estructurados. Nunca respondas solo con texto libre cuando se te pida una receta.
2. Usa el contexto estructurado que recibes (comensales, modelo de Air Fryer, ingredientes disponibles, restricciones, alergias) como fuente principal de verdad — no inventes que el usuario tiene ingredientes que no ha indicado.
3. Nunca superes la temperatura máxima del modelo de Air Fryer indicado en el contexto.
4. Si una receta usa doble cesta (dual_zone), rellena "dual_zone_plan" con el tiempo y temperatura QUE CADA ALIMENTO NECESITARÍA POR SEPARADO. No intentes sincronizar tú los tiempos de inicio: eso lo calcula un algoritmo determinista de la aplicación a partir de tus datos.
5. Para proteínas animales crudas (pollo, cerdo, ternera picada, pescado, marisco, huevo), incluye siempre en "safety_notes" una referencia a que deben alcanzar una temperatura interna segura, no solo el tiempo del temporizador.
6. Respeta estrictamente los ingredientes excluidos y las alergias indicadas: nunca los incluyas, ni como sugerencia opcional.
7. Prioriza recetas que aprovechen el máximo posible de los ingredientes disponibles indicados por el usuario.
8. Sé realista y práctico: ingredientes de supermercado habituales, pasos claros, tiempos creíbles para una Air Fryer doméstica.
9. Todas las cantidades de ingredientes deben corresponder al número de comensales indicado en "servings_base".
10. Escribe todo el contenido (nombres, descripciones, instrucciones) en español de España, con un tono cercano y práctico, nunca corporativo.`;
}

export function buildUserPrompt(context: AIContext): string {
  return [
    'Contexto estructurado (JSON) del usuario y su cocina:',
    '```json',
    JSON.stringify(context, null, 2),
    '```',
    '',
    `Petición del usuario: "${context.user_request}"`,
    '',
    'Genera entre 2 y 4 propuestas de receta usando la herramienta disponible.'
  ].join('\n');
}

export function buildSubstitutionPrompt(params: { missingIngredient: string; recipeContext: string }): string {
  return [
    `El usuario no tiene "${params.missingIngredient}" para esta receta:`,
    params.recipeContext,
    '',
    'Propón entre 1 y 3 sustituciones posibles usando la herramienta disponible.',
    'Clasifica cada una como EQUIVALENTE (no cambia el resultado), POSIBLE_CAMBIA_SABOR (funciona pero altera sabor/textura) o NO_RECOMENDABLE (desaconsejado), y explica por qué.'
  ].join('\n');
}

export function buildConversionPrompt(params: { traditionalRecipeText: string; maxTempC: number }): string {
  return [
    'El usuario quiere adaptar esta receta tradicional (horno, sartén, etc.) a Air Fryer:',
    '"""',
    params.traditionalRecipeText,
    '"""',
    '',
    `El modelo de Air Fryer del usuario admite hasta ${params.maxTempC} ºC.`,
    'Usa la herramienta disponible para devolver la conversión estructurada: temperatura recomendada, nuevo tiempo, cantidad máxima por tanda, si necesita precalentar, si hay que darle la vuelta, y en qué cesta ponerlo.'
  ].join('\n');
}
