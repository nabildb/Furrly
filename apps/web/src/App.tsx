import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { Loading } from './components/Page'
import { RequireAuth } from './components/RequireAuth'
import { ForgotPassword } from './pages/ForgotPassword'
import { Login } from './pages/Login'
import { MyPets } from './pages/MyPets'
import { MyReports } from './pages/MyReports'
import { Moderation } from './pages/Moderation'
import { Conversation, NewConversation } from './pages/Conversation'
import { Feed } from './pages/Feed'
import { Messages } from './pages/Messages'
import { NotFound } from './pages/NotFound'
import { Notifications } from './pages/Notifications'
import { PetDetail } from './pages/PetDetail'
import { PetEdit } from './pages/PetEdit'
import { PetNew } from './pages/PetNew'
import { PostDetail } from './pages/PostDetail'
import { PostNew } from './pages/PostNew'
import { Privacy } from './pages/Privacy'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'
import { SearchUsers } from './pages/SearchUsers'
import { UserProfile } from './pages/UserProfile'
import { Welcome } from './pages/Welcome'

// Las páginas con mapa (avisos y perfil) cargan Leaflet (~150 kB): se descargan solo cuando hacen falta.
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })))
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })))
const ReportEdit = lazy(() => import('./pages/ReportEdit').then((m) => ({ default: m.ReportEdit })))
const ReportDetail = lazy(() => import('./pages/ReportDetail').then((m) => ({ default: m.ReportDetail })))
const ReportNew = lazy(() => import('./pages/ReportNew').then((m) => ({ default: m.ReportNew })))
// El cartel lleva la librería del código QR: solo se descarga al abrirlo.
const Poster = lazy(() => import('./pages/Poster').then((m) => ({ default: m.Poster })))
// La guía de primeros pasos lleva el mapa (Leaflet).
const Onboarding = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })))

// Guía de componentes: solo en desarrollo (en producción Vite elimina esta rama).
const StyleGuide = import.meta.env.DEV
  ? lazy(() => import('./pages/StyleGuide').then((m) => ({ default: m.StyleGuide })))
  : null

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* La portada es el mapa: es lo primero que necesita quien ha perdido o encontrado un animal. */}
          <Route index element={<Navigate to="/avisos" replace />} />

          {/* Cartel para imprimir: sin navegación ni barra lateral. */}
          <Route path="avisos/:id/cartel" element={<Poster />} />
          {/* Guía de primeros pasos de las cuentas nuevas: a pantalla completa, sin navegación. */}
          <Route element={<RequireAuth />}>
            <Route path="empezar" element={<Onboarding />} />
          </Route>

          {/* Con la navegación flotante */}
          <Route element={<Layout />}>
            <Route path="login" element={<Login />} />
            <Route path="registro" element={<Register />} />
            <Route path="recuperar" element={<ForgotPassword />} />
            <Route path="restablecer" element={<ResetPassword />} />
            <Route path="u/:username" element={<UserProfile />} />
            <Route path="mascotas/:id" element={<PetDetail />} />
            <Route path="avisos" element={<Reports />} />
            <Route path="comunidad" element={<Feed />} />
            <Route path="publicaciones/:id" element={<PostDetail />} />
            <Route path="privacidad" element={<Privacy />} />
            <Route path="buscar" element={<SearchUsers />} />
            <Route element={<RequireAuth />}>
              <Route path="mascotas" element={<MyPets />} />
              <Route path="avisos/mios" element={<MyReports />} />
              <Route path="perfil" element={<Profile />} />
              <Route path="mensajes" element={<Messages />} />
              <Route path="notificaciones" element={<Notifications />} />
              <Route path="moderacion" element={<Moderation />} />
            </Route>
            {StyleGuide && <Route path="guia" element={<StyleGuide />} />}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Pantallas con su propia barra de acciones abajo */}
          <Route element={<Layout nav={false} />}>
            <Route path="avisos/:id" element={<ReportDetail />} />
            <Route element={<RequireAuth />}>
              <Route path="avisos/nuevo" element={<ReportNew />} />
              <Route path="avisos/:id/editar" element={<ReportEdit />} />
              <Route path="mascotas/nueva" element={<PetNew />} />
              <Route path="mascotas/:id/editar" element={<PetEdit />} />
              <Route path="publicaciones/nueva" element={<PostNew />} />
              <Route path="mensajes/nuevo" element={<NewConversation />} />
              <Route path="mensajes/:id" element={<Conversation />} />
              <Route path="bienvenida" element={<Welcome />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
