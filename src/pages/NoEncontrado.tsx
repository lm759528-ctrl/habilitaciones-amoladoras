import { Link } from 'react-router'

export function NoEncontrado() {
  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-900">Página no encontrada</h1>
      <Link to="/" className="mt-2 inline-block text-slate-600 underline underline-offset-2">
        Ir al inicio
      </Link>
    </section>
  )
}
