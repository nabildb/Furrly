import { Link } from 'react-router'

export function NotFound() {
  return (
    <section className="space-y-2 py-12 text-center">
      <p className="text-5xl">🐾</p>
      <h1 className="text-xl font-semibold">Por aquí no hay nadie</h1>
      <p className="text-gray-600">La página que buscas no existe o se ha movido.</p>
      <Link to="/" className="inline-block underline">
        Volver al inicio
      </Link>
    </section>
  )
}
