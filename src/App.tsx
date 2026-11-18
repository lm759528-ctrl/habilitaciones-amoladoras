import { Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { esAdmin, puedeCargarExamenes } from './auth/permisos'
import { Layout } from './components/Layout'
import { Administracion } from './pages/Administracion'
import { DetallePersona } from './pages/DetallePersona'
import { Listado } from './pages/Listado'
import { Login } from './pages/Login'
import { NoEncontrado } from './pages/NoEncontrado'
import { NuevaContrasena } from './pages/NuevaContrasena'
import { NuevoExamen } from './pages/NuevoExamen'
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
        <Route index element={<Listado />} />
        <Route path="personas/:id" element={<DetallePersona />} />
        <Route
          path="examenes/nuevo"
          element={
            <RequireAuth permitido={puedeCargarExamenes}>
              <NuevoExamen />
            </RequireAuth>
          }
        />
        <Route
          path="admin"
          element={
            <RequireAuth permitido={esAdmin}>
              <Administracion />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  )
}
