import { createDecipheriv, createECDH, hkdfSync, randomBytes } from 'node:crypto'
import { createLocalJWKSet, decodeProtectedHeader, jwtVerify } from 'jose'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { encryptPayload, isPushServiceUrl, vapidAuthorization } from '../src/lib/webpush.js'
import { createLostReport, createPet, createUser, request, RETIRO, SOL, type TestUser } from './helpers.js'

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/dispositivo-de-prueba'

/** Un "navegador" de prueba: par de claves ECDH y secreto de autenticación, como los que genera Chrome. */
function fakeBrowser() {
  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  const auth = randomBytes(16)
  return {
    ecdh,
    auth,
    keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: auth.toString('base64url') },
  }
}

/** Lo que hace el navegador al recibir el push (RFC 8291 al revés): sirve para comprobar el contenido. */
function decrypt(body: Buffer, browser: ReturnType<typeof fakeBrowser>) {
  const salt = body.subarray(0, 16)
  const idLength = body.readUInt8(20)
  const serverPublic = body.subarray(21, 21 + idLength)
  const ciphertext = body.subarray(21 + idLength)
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), browser.ecdh.getPublicKey(), serverPublic])
  const ikm = Buffer.from(hkdfSync('sha256', browser.ecdh.computeSecret(serverPublic), browser.auth, keyInfo, 32))
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16))
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12))
  const decipher = createDecipheriv('aes-128-gcm', cek, nonce)
  decipher.setAuthTag(ciphertext.subarray(-16))
  const plain = Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()])
  return JSON.parse(plain.subarray(0, -1).toString()) // el último byte es el delimitador 0x02
}

/** Simula el servicio de push: guarda lo que se le envía y responde con el código indicado. */
function mockPushService(status = 201) {
  const calls: { url: string; headers: Record<string, string>; body: Buffer }[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    calls.push({ url: String(input), headers: init?.headers as Record<string, string>, body: Buffer.from(init?.body as Uint8Array) })
    return new Response(null, { status })
  })
  return calls
}

async function subscribe(user: TestUser, browser = fakeBrowser(), endpoint = ENDPOINT) {
  const res = await request.post('/push/subscriptions').set(user.auth).send({ endpoint, keys: browser.keys })
  expect(res.status).toBe(201)
  return browser
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cifrado Web Push (RFC 8291)', () => {
  it('coincide con el ejemplo del apéndice A del RFC', () => {
    const body = encryptPayload(
      Buffer.from('When I grow up, I want to be a watermelon'),
      {
        p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
        auth: 'BTBZMqHH6r4Tts7J_aSIgg',
      },
      {
        salt: Buffer.from('DGv6ra1nlYgDCS1FRnbzlw', 'base64url'),
        serverPrivateKey: Buffer.from('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', 'base64url'),
      },
    )
    expect(body.toString('base64url')).toBe(
      'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
    )
  })

  it('el navegador puede descifrar lo que enviamos', () => {
    const browser = fakeBrowser()
    const body = encryptPayload(Buffer.from(JSON.stringify({ title: 'Hola' })), browser.keys)
    expect(decrypt(body, browser)).toEqual({ title: 'Hola' })
  })
})

describe('VAPID (RFC 8292)', () => {
  it('firma un JWT ES256 para el origen del servicio de push que se verifica con la clave pública', async () => {
    const publicKey = Buffer.from(process.env.VAPID_PUBLIC_KEY!, 'base64url')
    const header = await vapidAuthorization(ENDPOINT, {
      publicKey: process.env.VAPID_PUBLIC_KEY!,
      privateKey: process.env.VAPID_PRIVATE_KEY!,
      subject: 'https://furrly.test',
    })
    const [, jwt, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!
    expect(k).toBe(process.env.VAPID_PUBLIC_KEY)
    expect(decodeProtectedHeader(jwt).alg).toBe('ES256')

    const jwks = createLocalJWKSet({
      keys: [{ kty: 'EC', crv: 'P-256', x: publicKey.subarray(1, 33).toString('base64url'), y: publicKey.subarray(33).toString('base64url') }],
    })
    const { payload } = await jwtVerify(jwt, jwks, { audience: 'https://fcm.googleapis.com' })
    expect(payload.sub).toBe('https://furrly.test')
    expect(payload.exp! * 1000).toBeGreaterThan(Date.now())
  })

  it('solo admite servicios de push conocidos (evita SSRF)', () => {
    expect(isPushServiceUrl('https://fcm.googleapis.com/fcm/send/x')).toBe(true)
    expect(isPushServiceUrl('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true)
    expect(isPushServiceUrl('https://web.push.apple.com/x')).toBe(true)
    expect(isPushServiceUrl('http://fcm.googleapis.com/x')).toBe(false)
    expect(isPushServiceUrl('https://fcm.googleapis.com.evil.com/x')).toBe(false)
    expect(isPushServiceUrl('https://169.254.169.254/latest/meta-data')).toBe(false)
  })
})

describe('suscripciones y envío', () => {
  it('valida y guarda la suscripción; un dispositivo pasa a la cuenta que lo registra', async () => {
    const a = await createUser('nabil')
    const b = await createUser('vecina')
    const browser = fakeBrowser()

    const evil = await request.post('/push/subscriptions').set(a.auth).send({ endpoint: 'https://evil.example.com/x', keys: browser.keys })
    expect(evil.status).toBe(400)
    const badKey = await request.post('/push/subscriptions').set(a.auth).send({ endpoint: ENDPOINT, keys: { p256dh: 'abc', auth: 'abc' } })
    expect(badKey.status).toBe(400)

    await subscribe(a, browser)
    await subscribe(b, browser)
    expect(await prisma.pushSubscription.findMany({ select: { userId: true } })).toEqual([{ userId: b.id }])

    expect((await request.delete('/push/subscriptions').set(b.auth).send({ endpoint: ENDPOINT })).status).toBe(204)
    expect(await prisma.pushSubscription.count()).toBe(0)
    expect((await request.get('/push/key')).body.publicKey).toBe(process.env.VAPID_PUBLIC_KEY)
  })

  it('un aviso cerca de tu zona llega por push, cifrado y con VAPID', async () => {
    const reporter = await createUser('nabil')
    const neighbour = await createUser('vecina')
    await request.patch('/me').set(neighbour.auth).send({ alertLocation: RETIRO, alertRadiusKm: 5 })
    const browser = await subscribe(neighbour)
    const calls = mockPushService()

    const report = await createLostReport(reporter, (await createPet(reporter)).id, { ...SOL, title: 'Se ha perdido Luna' })

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(ENDPOINT)
    expect(calls[0].headers).toMatchObject({ 'Content-Encoding': 'aes128gcm', Urgency: 'high' })
    expect(calls[0].headers.Authorization).toMatch(/^vapid t=.+, k=.+$/)
    expect(decrypt(calls[0].body, browser)).toEqual({
      title: 'Mascota perdida cerca de ti',
      body: 'Se ha perdido Luna',
      url: `/avisos/${report.id}`,
      tag: `report-${report.id}`,
    })
  })

  it('los mensajes llegan por push al otro participante, y las suscripciones caducadas se borran', async () => {
    const recipient = await createUser('nabil')
    const sender = await createUser('vecina')
    const browser = await subscribe(recipient)
    const calls = mockPushService(410)

    const res = await request.post('/conversations').set(sender.auth).send({ username: 'nabil', body: 'Creo que he visto a Luna' })
    expect(res.status).toBe(201)
    expect(decrypt(calls[0].body, browser)).toMatchObject({
      title: 'Mensaje de @vecina',
      body: 'Creo que he visto a Luna',
      url: `/mensajes/${res.body.conversationId}`,
    })
    // 410 Gone: el navegador ya no existe, se borra la suscripción.
    expect(await prisma.pushSubscription.count()).toBe(0)
  })
})
