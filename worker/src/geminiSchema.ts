/**
 * Gemini espera el objeto "Schema" de su propia API (un subconjunto reducido
 * de OpenAPI 3.0), no un JSON Schema estándar: los tipos van en MAYÚSCULAS
 * (STRING, OBJECT, ARRAY...) y no admite `$schema`, `definitions` ni
 * `additionalProperties`. Esta función convierte el JSON Schema que genera
 * zod-to-json-schema (con target 'openApi3', que ya usa `nullable: true` en
 * vez de uniones de tipo) al formato que Gemini acepta.
 *
 * Referencia: https://ai.google.dev/api/caching#Schema
 *
 * Nota de honestidad: esta conversión se ha escrito según la documentación
 * pública de la API, pero no ha podido probarse contra la API real de Google
 * en este entorno (sin acceso de red a generativelanguage.googleapis.com).
 * Si Gemini rechaza algún esquema, revisa primero esta función.
 */

const TYPE_MAP: Record<string, string> = {
  string: 'STRING',
  number: 'NUMBER',
  integer: 'INTEGER',
  boolean: 'BOOLEAN',
  array: 'ARRAY',
  object: 'OBJECT'
};

export function toGeminiSchema(node: unknown): any {
  if (node === null || node === undefined || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(toGeminiSchema);

  const n = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (typeof n.type === 'string') {
    out.type = TYPE_MAP[n.type] ?? n.type.toUpperCase();
  }
  if (typeof n.description === 'string') out.description = n.description;
  if (Array.isArray(n.enum)) out.enum = n.enum;
  if (n.nullable === true) out.nullable = true;

  if (n.properties && typeof n.properties === 'object') {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(n.properties as Record<string, unknown>)) {
      props[key] = toGeminiSchema(value);
    }
    out.properties = props;
  }
  if (Array.isArray(n.required)) out.required = n.required;
  if (n.items) out.items = toGeminiSchema(n.items);
  if (typeof n.minItems === 'number') out.minItems = n.minItems;
  if (typeof n.maxItems === 'number') out.maxItems = n.maxItems;

  return out;
}
