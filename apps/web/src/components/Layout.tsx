import { Outlet } from 'react-router'
import { useAccountGate } from '../lib/accountGate'
import { BottomNav } from './ui/BottomNav'
import { Sidebar } from './ui/Sidebar'

/**
 * Marco de la app. Cada página decide su ancho y cabecera (ver Page.tsx), porque el mapa
 * ocupa toda la pantalla y el resto va centrado.
 * - Móvil y tablet: navegación flotante abajo, salvo en pantallas con su propia barra de
 *   acciones abajo (ficha, publicar, formularios), que se montan con nav={false}.
 * - Escritorio: barra lateral fija siempre; el contenido se desplaza su ancho (--sidebar-w).
 */
export function Layout({ nav = true }: { nav?: boolean }) {
  useAccountGate()
  return (
    <>
      <Sidebar />
      <div className="lg:pl-(--sidebar-w)">
        <Outlet />
      </div>
      {nav && <BottomNav />}
    </>
  )
}
