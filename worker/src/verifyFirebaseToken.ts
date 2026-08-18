import { createRemoteJWKSet, jwtVerify } from 'jose';

// Endpoint JWKS (formato JWK estándar) para las claves públicas que usa
// Firebase Auth para firmar los ID tokens. Es el equivalente en formato JWK
// del endpoint x509 que usa el Admin SDK — funciona igual, pero jose sabe
// consumirlo directamente sin parsear certificados X.509 a mano.
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

export interface VerifiedToken {
  uid: string;
  email?: string;
}

/**
 * Verifica un ID token de Firebase Auth: firma, emisor, audiencia y
 * caducidad. Lanza un error si algo no cuadra — nunca devuelve un resultado
 * "parcialmente válido".
 */
export async function verifyFirebaseIdToken(token: string, projectId: string): Promise<VerifiedToken> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId
  });

  if (!payload.sub) {
    throw new Error('Token sin "sub" (uid).');
  }

  return { uid: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined };
}
