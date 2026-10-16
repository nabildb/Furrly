import { Outlet } from 'react-router'
import { BottomNav } from './ui/BottomNav'

/**
 * Marco de la app. Cada página decide su ancho y cabecera (ver Page.tsx), porque el mapa
 * ocupa toda la pantalla y el resto va centrado. Las pantallas con su propia barra de
 * acciones abajo (ficha, publicar, formularios) se montan sin la navegación.
 */
export function Layout({ nav = true }: { nav?: boolean }) {
  return (
    <>
      <Outlet />
      {nav && <BottomNav />}
    </>
  )
}
