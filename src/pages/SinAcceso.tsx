import { useAuth } from '../auth/AuthContext'
import { Aviso, Boton, PantallaCentrada } from '../components/ui'

export function SinAcceso() {
  const { session, salir } = useAuth()
  return (
    <PantallaCentrada titulo="Sin acceso">
      <div className="flex flex-col gap-4">
        <Aviso tipo="error">
          Tu usuario ({session?.user.email}) no tiene permisos en esta aplicación o fue dado de baja. Pedile acceso al
          administrador.
        </Aviso>
        <Boton type="button" onClick={() => void salir()}>
          Salir
        </Boton>
      </div>
    </PantallaCentrada>
  )
}
