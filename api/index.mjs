// Función serverless de Vercel: sirve la API de Express bajo /api.
// Usa la versión compilada (apps/api/dist), que genera el buildCommand de vercel.json.
import express from 'express'
import { app } from '../apps/api/dist/app.js'

// La API define sus rutas sin prefijo (/pets, /reports...); aquí cuelgan de /api.
const server = express()
server.use('/api', app)

// Vistas previas para WhatsApp, Telegram... (vercel.json solo manda aquí a sus robots).
server.get('/avisos/:id', (req, res, next) => {
  req.url = `/share${req.originalUrl}`
  app(req, res, next)
})

export default server
