import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <p className="font-mono text-4xl font-medium text-primary">404</p>
      <p className="mt-2 font-semibold">Página não encontrada</p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition-colors duration-150 hover:bg-primary-hover"
      >
        Voltar ao painel
      </Link>
    </div>
  )
}
