import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import './index.css'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { MyPets } from './pages/MyPets'
import { PetDetail } from './pages/PetDetail'
import { PetEdit } from './pages/PetEdit'
import { PetNew } from './pages/PetNew'
import { Register } from './pages/Register'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="registro" element={<Register />} />
            <Route path="mascotas/:id" element={<PetDetail />} />
            <Route element={<RequireAuth />}>
              <Route path="mascotas" element={<MyPets />} />
              <Route path="mascotas/nueva" element={<PetNew />} />
              <Route path="mascotas/:id/editar" element={<PetEdit />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
