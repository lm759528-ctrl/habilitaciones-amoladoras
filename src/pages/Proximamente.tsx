// Lugar reservado para las pantallas de las próximas etapas.
export function Proximamente({ titulo, etapa }: { titulo: string; etapa: number }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-900">{titulo}</h1>
      <p className="mt-2 text-slate-600">Esta pantalla llega en la etapa {etapa}.</p>
    </section>
  )
}
