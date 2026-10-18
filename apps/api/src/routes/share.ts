import { Router } from 'express'
import { z } from 'zod'
import { env } from '../lib/env.js'
import { prisma } from '../lib/prisma.js'

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const absolute = (url: string) => (url.startsWith('http') ? url : new URL(url, env.PUBLIC_SITE_URL).href)

const speciesLabels = { dog: 'Perro', cat: 'Gato', rabbit: 'Conejo', bird: 'Pájaro', other: 'Animal' } as const

function page(meta: { title: string; description: string; image: string; url: string }) {
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  const image = escapeHtml(meta.image)
  const url = escapeHtml(meta.url)
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${title} · Furrly</title>
<meta name="description" content="${description}">
<meta property="og:site_name" content="Furrly">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${url}">
</head>
<body><p><a href="${url}">${title}</a></p><p>${description}</p></body>
</html>`
}

/**
 * Vistas previas al compartir un enlace (WhatsApp, Telegram, Facebook...). Sus robots no ejecutan
 * JavaScript, así que en la web solo verían el index.html genérico. vercel.json les manda aquí las
 * páginas de avisos (solo a ellos, por el User-Agent); las personas reciben la web normal.
 */
export const shareRouter = Router()

shareRouter.get('/avisos/:id', async (req, res) => {
  const url = `${env.PUBLIC_SITE_URL}/avisos/${encodeURIComponent(String(req.params.id))}`
  const id = z.uuid().safeParse(req.params.id)
  const report = id.success
    ? await prisma.report.findUnique({
        where: { id: id.data },
        select: {
          type: true,
          status: true,
          species: true,
          title: true,
          addressText: true,
          happenedAt: true,
          pet: { select: { name: true, photoUrl: true } },
          photos: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
        },
      })
    : null

  res.set('Cache-Control', 'public, max-age=300, s-maxage=300')
  if (!report) {
    res.send(page({ title: 'Furrly', description: 'Mascotas perdidas y encontradas cerca de ti.', image: absolute('/icons/icon-512.png'), url }))
    return
  }

  const what = report.pet?.name ?? speciesLabels[report.species]
  const when = report.happenedAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })
  const where = report.addressText ? ` en ${report.addressText}` : ''
  const description =
    report.status === 'resolved'
      ? '¡Ya ha vuelto a casa! Gracias a todos los que ayudasteis.'
      : report.type === 'lost'
        ? `${what} se perdió${where} el ${when}. Si la ves, avisa en Furrly.`
        : `Encontrado${where} el ${when}. ¿Sabes de quién es? Avisa en Furrly.`
  const photo = report.photos[0]?.url ?? report.pet?.photoUrl ?? '/icons/icon-512.png'

  res.send(page({ title: report.title, description, image: absolute(photo), url }))
})
