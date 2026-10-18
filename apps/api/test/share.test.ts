import { describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.js'
import { createLostReport, createPet, createUser, mediaUrl, request } from './helpers.js'

const meta = (html: string, property: string) => new RegExp(`<meta property="${property}" content="([^"]*)">`).exec(html)?.[1]

describe('vista previa al compartir un aviso', () => {
  it('lleva el título, la zona y la foto de la mascota con URLs absolutas', async () => {
    const owner = await createUser('nabil')
    const pet = await createPet(owner)
    const photo = mediaUrl(owner.id)
    await prisma.pet.update({ where: { id: pet.id }, data: { photoUrl: photo } })
    const report = await createLostReport(owner, pet.id, { addressText: 'Parque del Retiro' })

    const res = await request.get(`/share/avisos/${report.id}`)
    expect(res.headers['content-type']).toMatch(/text\/html/)
    expect(meta(res.text, 'og:title')).toBe('Se ha perdido Luna')
    expect(meta(res.text, 'og:description')).toMatch(/^Luna se perdió en Parque del Retiro el \d+ de \w+\. Si la ves, avisa en Furrly\.$/)
    expect(meta(res.text, 'og:image')).toBe(photo)
    expect(meta(res.text, 'og:url')).toBe(`https://furrly-rouge.vercel.app/avisos/${report.id}`)
  })

  it('escapa lo que escribe el usuario (nada de HTML inyectado en la página)', async () => {
    const owner = await createUser('nabil')
    const pet = await createPet(owner)
    const report = await createLostReport(owner, pet.id, { title: 'Luna "</title><script>alert(1)</script>' })

    const res = await request.get(`/share/avisos/${report.id}`)
    expect(res.text).not.toContain('<script>')
    expect(meta(res.text, 'og:title')).toBe('Luna &quot;&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;')
    // Sin foto: el icono de Furrly, también con URL absoluta.
    expect(meta(res.text, 'og:image')).toBe('https://furrly-rouge.vercel.app/icons/icon-512.png')
  })

  it('si el aviso no existe, una vista previa genérica de Furrly', async () => {
    for (const id of ['00000000-0000-4000-8000-000000000000', 'nuevo']) {
      const res = await request.get(`/share/avisos/${id}`)
      expect(res.status).toBe(200)
      expect(meta(res.text, 'og:title')).toBe('Furrly')
    }
  })
})
