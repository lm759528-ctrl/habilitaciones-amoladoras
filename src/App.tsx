import { Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { esAdmin, puedeCargarExamenes } from './auth/permisos'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { NoEncontrado } from './pages/NoEncontrado'
import { NuevaContrasena } from './pages/NuevaContrasena'
import { Proximamente } from './pages/Proximamente'
import { RecuperarContrasena } from './pages/RecuperarContrasena'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar" element={<RecuperarContrasena />} />
      <Route path="/nueva-contrasena" element={<NuevaContrasena />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Proximamente titulo="Habilitados" etapa={3} />} />
        <Route
          path="examenes/nuevo"
          element={
            <RequireAuth permitido={puedeCargarExamenes}>
              <Proximamente titulo="Nuevo examen" etapa={4} />
            </RequireAuth>
          }
        />
        <Route
          path="admin"
          element={
            <RequireAuth permitido={esAdmin}>
              <Proximamente titulo="Administración" etapa={6} />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  )
}
