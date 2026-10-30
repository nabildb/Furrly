import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Layout } from './components/Layout'
import { Loading } from './components/Page'
import { RequireAuth } from './components/RequireAuth'

/**
 * Cada página es su propio archivo JS y se descarga al abrirla: quien entra al mapa (la portada)
 * no descarga el código de mensajes, moderación, comunidad... Las del mapa, además, cargan Leaflet
 * (~150 kB) y el cartel la librería del código QR. Al navegar, React Router usa transiciones:
 * la página anterior se queda en pantalla mientras llega la nueva, sin parpadeos.
 */
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })))
}

const Cookies = page(() => import('./pages/Cookies'), 'Cookies')
const Conversation = page(() => import('./pages/Conversation'), 'Conversation')
const NewConversation = page(() => import('./pages/Conversation'), 'NewConversation')
const Feed = page(() => import('./pages/Feed'), 'Feed')
const ForgotPassword = page(() => import('./pages/ForgotPassword'), 'ForgotPassword')
const LegalNotice = page(() => import('./pages/LegalNotice'), 'LegalNotice')
const Login = page(() => import('./pages/Login'), 'Login')
const Messages = page(() => import('./pages/Messages'), 'Messages')
const Moderation = page(() => import('./pages/Moderation'), 'Moderation')
const ModerationUser = page(() => import('./pages/ModerationUser'), 'ModerationUser')
const MyPets = page(() => import('./pages/MyPets'), 'MyPets')
const MyReports = page(() => import('./pages/MyReports'), 'MyReports')
const NotFound = page(() => import('./pages/NotFound'), 'NotFound')
const Notifications = page(() => import('./pages/Notifications'), 'Notifications')
const Onboarding = page(() => import('./pages/Onboarding'), 'Onboarding')
const PetDetail = page(() => import('./pages/PetDetail'), 'PetDetail')
const PetEdit = page(() => import('./pages/PetEdit'), 'PetEdit')
const PetNew = page(() => import('./pages/PetNew'), 'PetNew')
const PostDetail = page(() => import('./pages/PostDetail'), 'PostDetail')
const PostNew = page(() => import('./pages/PostNew'), 'PostNew')
const Poster = page(() => import('./pages/Poster'), 'Poster')
const Privacy = page(() => import('./pages/Privacy'), 'Privacy')
const Profile = page(() => import('./pages/Profile'), 'Profile')
const Register = page(() => import('./pages/Register'), 'Register')
const ReportDetail = page(() => import('./pages/ReportDetail'), 'ReportDetail')
const ReportEdit = page(() => import('./pages/ReportEdit'), 'ReportEdit')
const ReportNew = page(() => import('./pages/ReportNew'), 'ReportNew')
const Reports = page(() => import('./pages/Reports'), 'Reports')
const ResetPassword = page(() => import('./pages/ResetPassword'), 'ResetPassword')
const SearchUsers = page(() => import('./pages/SearchUsers'), 'SearchUsers')
const Terms = page(() => import('./pages/Terms'), 'Terms')
const UserProfile = page(() => import('./pages/UserProfile'), 'UserProfile')
const Welcome = page(() => import('./pages/Welcome'), 'Welcome')

// Guía de componentes: solo en desarrollo (en producción Vite elimina esta rama).
const StyleGuide = import.meta.env.DEV
  ? page(() => import('./pages/StyleGuide'), 'StyleGuide')
  : null

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
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
              <Route path="aviso-legal" element={<LegalNotice />} />
              <Route path="privacidad" element={<Privacy />} />
              <Route path="cookies" element={<Cookies />} />
              <Route path="condiciones" element={<Terms />} />
              <Route path="buscar" element={<SearchUsers />} />
              <Route element={<RequireAuth />}>
                <Route path="mascotas" element={<MyPets />} />
                <Route path="avisos/mios" element={<MyReports />} />
                <Route path="perfil" element={<Profile />} />
                <Route path="mensajes" element={<Messages />} />
                <Route path="notificaciones" element={<Notifications />} />
                <Route path="moderacion" element={<Moderation />} />
                <Route path="moderacion/usuarios/:username" element={<ModerationUser />} />
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
      </ErrorBoundary>
    </BrowserRouter>
  )
}
