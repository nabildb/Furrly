import { exportJWK, generateKeyPair, SignJWT } from 'jose'

// Par de claves ES256 generado para esta ejecución: hace de "Supabase Auth".
export const TEST_ISSUER = 'http://supabase.test/auth/v1'

const { privateKey, publicKey } = await generateKeyPair('ES256')
export const publicJwks = { keys: [{ ...(await exportJWK(publicKey)), kid: 'test', alg: 'ES256' }] }

export function signToken(userId: string, overrides: { issuer?: string; audience?: string; expiresIn?: string } = {}) {
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'ES256', kid: 'test' })
    .setSubject(userId)
    .setIssuer(overrides.issuer ?? TEST_ISSUER)
    .setAudience(overrides.audience ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(overrides.expiresIn ?? '1h')
    .sign(privateKey)
}
