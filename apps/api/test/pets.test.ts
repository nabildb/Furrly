import { describe, expect, it } from 'vitest'
import { createLostReport, createPet, createUser, mediaUrl, request } from './helpers.js'

describe('mascotas', () => {
  it('crea una mascota y devuelve el microchip solo al dueño', async () => {
    const owner = await createUser('nabil')
    const created = await request
      .post('/pets')
      .set(owner.auth)
      .send({ name: 'Luna', species: 'dog', microchip: '123456789012345', photoUrl: mediaUrl(owner.id) })
    expect(created.status).toBe(201)
    expect(created.body.microchip).toBe('123456789012345')

    const publicView = await request.get(`/pets/${created.body.id}`)
    expect(publicView.status).toBe(200)
    expect(publicView.body).not.toHaveProperty('microchip')
    expect(publicView.body.owner.username).toBe('nabil')
  })

  it('valida los datos de entrada', async () => {
    const owner = await createUser('nabil')
    const res = await request.post('/pets').set(owner.auth).send({ name: '', species: 'dragon' })
    expect(res.status).toBe(400)
  })

  it('no acepta fotos fuera de la carpeta del usuario', async () => {
    const owner = await createUser('nabil')
    const other = await createUser('otra')
    for (const photoUrl of ['https://evil.example.com/a.png', mediaUrl(other.id)]) {
      const res = await request.post('/pets').set(owner.auth).send({ name: 'Luna', species: 'dog', photoUrl })
      expect(res.status).toBe(400)
    }
  })

  it('no deja editar ni borrar mascotas ajenas', async () => {
    const owner = await createUser('nabil')
    const intruder = await createUser('intruso')
    const pet = await createPet(owner)

    expect((await request.patch(`/pets/${pet.id}`).set(intruder.auth).send({ name: 'Hack' })).status).toBe(404)
    expect((await request.delete(`/pets/${pet.id}`).set(intruder.auth)).status).toBe(404)
    expect((await request.get(`/pets/${pet.id}`)).body.name).toBe('Luna')
  })

  it('al borrar una mascota se borran sus avisos', async () => {
    const owner = await createUser('nabil')
    const pet = await createPet(owner)
    const report = await createLostReport(owner, pet.id)

    expect((await request.delete(`/pets/${pet.id}`).set(owner.auth)).status).toBe(204)
    expect((await request.get(`/reports/${report.id}`)).status).toBe(404)
  })

  it('lista las mascotas propias y las públicas de un usuario', async () => {
    const owner = await createUser('nabil')
    await createPet(owner, { name: 'Luna', microchip: '111' })
    await createPet(owner, { name: 'Toby', species: 'cat' })

    const mine = await request.get('/me/pets').set(owner.auth)
    expect(mine.body.map((p: { name: string }) => p.name)).toEqual(['Luna', 'Toby'])
    expect(mine.body[0].microchip).toBe('111')

    const publicList = await request.get('/users/NABIL/pets')
    expect(publicList.body).toHaveLength(2)
    expect(publicList.body[0]).not.toHaveProperty('microchip')
  })
})
