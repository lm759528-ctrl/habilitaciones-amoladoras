import { useCallback, useEffect, useState } from 'react'

export interface Consulta<T> {
  datos: T | undefined
  error: unknown
  cargando: boolean
  recargar: () => void
}

/** Ejecuta una consulta async al montar (y cuando cambian las dependencias). */
export function useConsulta<T>(consulta: () => Promise<T>, deps: unknown[]): Consulta<T> {
  const [datos, setDatos] = useState<T>()
  const [error, setError] = useState<unknown>(null)
  const [cargando, setCargando] = useState(true)
  const [vuelta, setVuelta] = useState(0)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError(null)
    consulta()
      .then((d) => vigente && setDatos(d))
      .catch((e) => vigente && setError(e))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [...deps, vuelta])

  const recargar = useCallback(() => setVuelta((v) => v + 1), [])
  return { datos, error, cargando, recargar }
}
