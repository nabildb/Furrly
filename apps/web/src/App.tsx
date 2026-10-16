import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { ForgotPassword } from './pages/ForgotPassword'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { MyPets } from './pages/MyPets'
import { MyReports } from './pages/MyReports'
import { NotFound } from './pages/NotFound'
import { PetDetail } from './pages/PetDetail'
import { PetEdit } from './pages/PetEdit'
import { PetNew } from './pages/PetNew'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'
import { UserProfile } from './pages/UserProfile'

// Las páginas con mapa (avisos y perfil) cargan Leaflet (~150 kB): se descargan solo cuando hacen falta.
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })))
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })))
const ReportEdit = lazy(() => import('./pages/ReportEdit').then((m) => ({ default: m.ReportEdit })))
const ReportDetail = lazy(() => import('./pages/ReportDetail').then((m) => ({ default: m.ReportDetail })))
const ReportNew = lazy(() => import('./pages/ReportNew').then((m) => ({ default: m.ReportNew })))

// Guía de componentes: solo en desarrollo (en producción Vite elimina esta rama).
const StyleGuide = import.meta.env.DEV
  ? lazy(() => import('./pages/StyleGuide').then((m) => ({ default: m.StyleGuide })))
  : null

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<p className="p-6">Cargando…</p>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="registro" element={<Register />} />
            <Route path="recuperar" element={<ForgotPassword />} />
            <Route path="restablecer" element={<ResetPassword />} />
            <Route path="u/:username" element={<UserProfile />} />
            <Route path="mascotas/:id" element={<PetDetail />} />
            <Route path="avisos" element={<Reports />} />
            <Route path="avisos/:id" element={<ReportDetail />} />
            <Route element={<RequireAuth />}>
              <Route path="mascotas" element={<MyPets />} />
              <Route path="mascotas/nueva" element={<PetNew />} />
              <Route path="mascotas/:id/editar" element={<PetEdit />} />
              <Route path="avisos/nuevo" element={<ReportNew />} />
              <Route path="avisos/mios" element={<MyReports />} />
              <Route path="avisos/:id/editar" element={<ReportEdit />} />
              <Route path="perfil" element={<Profile />} />
            </Route>
            {StyleGuide && <Route path="guia" element={<StyleGuide />} />}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
