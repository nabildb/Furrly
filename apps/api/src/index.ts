import { app } from './app.js'
import { env } from './lib/env.js'

app.listen(env.PORT, () => {
  console.log(`API de Furrly escuchando en http://localhost:${env.PORT}`)
})
