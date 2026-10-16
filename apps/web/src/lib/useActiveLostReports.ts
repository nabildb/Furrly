import { useEffect, useState } from 'react'
import { api } from './api'
import type { MyReport } from './reports'

/**
 * Mascotas del usuario que ya tienen un aviso de pérdida activo → id de ese aviso.
 * La API no deja abrir dos a la vez (409), así que la web lo sabe antes y ofrece "Ver su aviso".
 * `enabled` = false para no pedir nada si quien mira no es el dueño. Devuelve null mientras carga.
 */
export function useActiveLostReports(enabled = true) {
  const [byPet, setByPet] = useState<Map<string, string> | null>(null)

  useEffect(() => {
    if (!enabled) return
    api<MyReport[]>('/me/reports')
      .then((reports) =>
        setByPet(
          new Map(
            reports
              .filter((r) => r.type === 'lost' && r.status === 'active' && r.petId)
              .map((r) => [r.petId!, r.id]),
          ),
        ),
      )
      // Si falla, el botón de avisar sigue ahí y la API responde con un error claro.
      .catch(() => setByPet(new Map()))
  }, [enabled])

  return byPet
}
