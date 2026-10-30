import { useEffect } from 'react'

/**
 * Título de la pestaña. En una web de una sola página el navegador no lo cambia al navegar: sin
 * esto todas se llamarían igual en el historial, y es lo primero que lee un lector de pantalla.
 * `undefined` mientras carga el dato que da nombre a la página.
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    if (!title) return
    document.title = `${title} · Furrly`
    return () => {
      document.title = 'Furrly'
    }
  }, [title])
}
