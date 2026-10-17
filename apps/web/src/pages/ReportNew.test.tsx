import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, useParams } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import type { LatLng } from '../lib/reports'
import { renderRoutes } from '../test/render'
import { ReportNew } from './ReportNew'

vi.mock('../lib/api', () => ({ api: vi.fn() }))
// El mapa (Leaflet) no aporta nada aquí: lo sustituye un botón que "marca" un punto fijo.
vi.mock('../components/LocationPicker', () => ({
  LocationPicker: ({ onChange }: { onChange: (p: LatLng) => void }) => (
    <button type="button" onClick={() => onChange({ lat: 40.42, lng: -3.7 })}>
      Marcar punto
    </button>
  ),
}))

const pets = [
  { id: 'luna', name: 'Luna', species: 'dog', photoUrl: null },
  { id: 'toby', name: 'Toby', species: 'cat', photoUrl: null },
]

function ReportPage() {
  return <p>Ficha del aviso {useParams().id}</p>
}

function renderWizard() {
  return renderRoutes(
    <>
      <Route path="/avisos/nuevo" element={<ReportNew />} />
      <Route path="/avisos/:id" element={<ReportPage />} />
    </>,
    { path: '/avisos/nuevo' },
  )
}

const next = () => userEvent.click(screen.getByRole('button', { name: /^Siguiente/ }))

beforeEach(() => {
  vi.mocked(api).mockImplementation(async (path: string) => {
    if (path === '/me/pets') return pets
    // Luna ya tiene un aviso de pérdida activo.
    if (path === '/me/reports') return [{ id: 'r0', type: 'lost', status: 'active', petId: 'luna' }]
    if (path === '/reports') return { id: 'nuevo-123' }
    throw new Error(`Petición no esperada: ${path}`)
  })
})

describe('asistente de publicar aviso', () => {
  it('recorre los 3 pasos, valida cada uno y publica lo que ha rellenado el usuario', async () => {
    renderWizard()

    // Paso 1: Luna no se puede elegir (ya tiene aviso) y Toby queda marcado.
    expect(await screen.findByRole('heading', { name: '¿Qué ha pasado?' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Luna/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Toby/ })).toBeChecked()
    await next()

    // Paso 2: sin marcar el lugar no se avanza.
    expect(screen.getByRole('heading', { name: '¿Dónde y cuándo?' })).toBeInTheDocument()
    await next()
    expect(screen.getByRole('alert')).toHaveTextContent('Marca en el mapa dónde se perdió.')
    await userEvent.click(screen.getByRole('button', { name: 'Marcar punto' }))
    await userEvent.type(screen.getByRole('textbox', { name: /Zona o dirección/ }), 'Malasaña')
    await next()

    // Paso 3: el título se propone con la mascota y la zona.
    expect(screen.getByRole('heading', { name: 'Cuéntanos más' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Título' })).toHaveValue('Se ha perdido Toby en Malasaña')
    await userEvent.type(screen.getByRole('textbox', { name: /^Descripción/ }), 'Gato atigrado con collar verde')
    await userEvent.type(screen.getByRole('textbox', { name: 'Teléfono' }), '600123456')
    await userEvent.click(screen.getByRole('button', { name: 'Publicar aviso' }))

    expect(await screen.findByText('Ficha del aviso nuevo-123')).toBeInTheDocument()
    const [, init] = vi.mocked(api).mock.calls.find(([path]) => path === '/reports')!
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toMatchObject({
      type: 'lost',
      petId: 'toby',
      title: 'Se ha perdido Toby en Malasaña',
      description: 'Gato atigrado con collar verde',
      addressText: 'Malasaña',
      lat: 40.42,
      lng: -3.7,
      contactPhone: '600123456',
      photoUrls: [],
    })
  })

  it('volver atrás no pierde lo escrito', async () => {
    renderWizard()
    await screen.findByRole('heading', { name: '¿Qué ha pasado?' })
    await next()
    await userEvent.type(screen.getByRole('textbox', { name: /Zona o dirección/ }), 'Retiro')
    await userEvent.click(screen.getByRole('button', { name: 'Paso anterior' }))
    await next()
    expect(screen.getByRole('textbox', { name: /Zona o dirección/ })).toHaveValue('Retiro')
  })

  it('para un animal encontrado pide la especie en vez de la mascota', async () => {
    renderWizard()
    await screen.findByRole('heading', { name: '¿Qué ha pasado?' })
    await userEvent.click(screen.getByRole('radio', { name: /He encontrado un animal/ }))
    expect(screen.queryByRole('radio', { name: /Toby/ })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Perro' })).toBeChecked()
  })
})
