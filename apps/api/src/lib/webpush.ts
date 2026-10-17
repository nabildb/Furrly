import { createCipheriv, createECDH, hkdfSync, randomBytes } from 'node:crypto'
import { importJWK, SignJWT } from 'jose'

/**
 * Web Push implementado a mano (sin la librería web-push), siguiendo dos RFC:
 * - RFC 8291: el mensaje va cifrado de extremo a extremo para el navegador (ECDH P-256 + HKDF + AES-128-GCM).
 *   El servicio de push (Google, Mozilla, Apple...) lo reenvía sin poder leerlo.
 * - RFC 8292 (VAPID): el servidor se identifica ante el servicio de push con un JWT ES256.
 */

export interface PushTarget {
  endpoint: string
  /** Clave pública ECDH del navegador (P-256 sin comprimir, 65 bytes, base64url). */
  p256dh: string
  /** Secreto de autenticación del navegador (16 bytes, base64url). */
  auth: string
}

export interface VapidKeys {
  /** Clave pública P-256 sin comprimir (65 bytes, base64url): es la "applicationServerKey" del navegador. */
  publicKey: string
  /** Clave privada (32 bytes, base64url). */
  privateKey: string
  /** Contacto del responsable del servidor (mailto: o https:), lo pide el RFC. */
  subject: string
}

const RECORD_SIZE = 4096
const text = (s: string) => Buffer.from(s, 'utf8')

/**
 * Cifra el contenido como "aes128gcm" (RFC 8291 + RFC 8188).
 * `salt` y `serverPrivateKey` solo se pasan en los tests (vector del RFC); en uso real son aleatorios.
 */
export function encryptPayload(
  payload: Buffer,
  target: Pick<PushTarget, 'p256dh' | 'auth'>,
  options: { salt?: Buffer; serverPrivateKey?: Buffer } = {},
) {
  const uaPublic = Buffer.from(target.p256dh, 'base64url')
  const authSecret = Buffer.from(target.auth, 'base64url')

  // Clave efímera del servidor para este mensaje y secreto compartido con el navegador.
  const ecdh = createECDH('prime256v1')
  if (options.serverPrivateKey) ecdh.setPrivateKey(options.serverPrivateKey)
  else ecdh.generateKeys()
  const asPublic = ecdh.getPublicKey()
  const ecdhSecret = ecdh.computeSecret(uaPublic)

  // IKM = HKDF(salt = auth, ikm = secreto ECDH, info = "WebPush: info\0" || clave navegador || clave servidor)
  const keyInfo = Buffer.concat([text('WebPush: info\0'), uaPublic, asPublic])
  const ikm = Buffer.from(hkdfSync('sha256', ecdhSecret, authSecret, keyInfo, 32))

  // Clave de contenido y nonce derivados con una sal aleatoria por mensaje.
  const salt = options.salt ?? randomBytes(16)
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, text('Content-Encoding: aes128gcm\0'), 16))
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, text('Content-Encoding: nonce\0'), 12))

  // Un único registro: contenido + delimitador 0x02 ("último registro"), cifrado con AES-128-GCM.
  const cipher = createCipheriv('aes-128-gcm', cek, nonce)
  const ciphertext = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()])

  // Cabecera: sal (16) | tamaño de registro (uint32) | longitud del id (1) | id = clave pública del servidor (65)
  const header = Buffer.alloc(21)
  salt.copy(header, 0)
  header.writeUInt32BE(RECORD_SIZE, 16)
  header.writeUInt8(asPublic.length, 20)
  return Buffer.concat([header, asPublic, ciphertext])
}

/** Cabecera Authorization de VAPID: un JWT firmado con nuestra clave privada para el origen del servicio de push. */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys) {
  const publicKey = Buffer.from(keys.publicKey, 'base64url')
  const key = await importJWK(
    {
      kty: 'EC',
      crv: 'P-256',
      d: keys.privateKey,
      x: publicKey.subarray(1, 33).toString('base64url'),
      y: publicKey.subarray(33, 65).toString('base64url'),
    },
    'ES256',
  )
  const jwt = await new SignJWT({ sub: keys.subject })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setAudience(new URL(endpoint).origin)
    .setExpirationTime('12h')
    .sign(key)
  return `vapid t=${jwt}, k=${keys.publicKey}`
}

export interface PushResult {
  /** Código HTTP del servicio de push: 201 = aceptado; 404/410 = suscripción caducada; 403 = VAPID rechazado. */
  status: number
  /** Motivo que da el servicio cuando rechaza el envío (p. ej. Apple: {"reason":"BadJwtToken"}). */
  reason?: string
}

/** Envía un mensaje push y devuelve lo que contestó el servicio de push. */
export async function sendWebPush(target: PushTarget, payload: unknown, keys: VapidKeys): Promise<PushResult> {
  const body = encryptPayload(Buffer.from(JSON.stringify(payload)), target)
  const res = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(target.endpoint, keys),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(24 * 60 * 60),
      Urgency: 'high',
    },
    body,
    signal: AbortSignal.timeout(5000),
  })
  if (res.ok) return { status: res.status }
  return { status: res.status, reason: (await res.text().catch(() => '')).slice(0, 200) || undefined }
}

/**
 * Servicios de push de los navegadores. Solo aceptamos endpoints suyos: el servidor hace un POST
 * a esa URL, y si aceptásemos cualquiera nos podrían usar para atacar otros servidores (SSRF).
 */
const PUSH_HOSTS = ['fcm.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com']

export function isPushServiceUrl(endpoint: string) {
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' && PUSH_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))
  } catch {
    return false
  }
}
