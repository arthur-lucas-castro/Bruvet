import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDebouncedValue } from '../../lib/use-debounced-value'

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  className?: string
}

/** Campo de busca que só avisa a mudança depois que a pessoa para de digitar. */
export function SearchInput({ value, onChange, label, placeholder, className = '' }: SearchInputProps) {
  const [text, setText] = useState(value)
  const debounced = useDebouncedValue(text)

  useEffect(() => {
    if (debounced !== value) onChange(debounced)
    // Só reage ao valor digitado; `value` externo é sincronizado no efeito abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  // Mantém o campo igual à URL quando ela muda por fora (ex.: botão voltar)
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    if (value !== debounced) setText(value)
  }

  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className="block min-h-11 w-full rounded-lg border border-border bg-card pl-9 pr-10 text-base transition-colors duration-150 placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText('')
            onChange('')
          }}
          aria-label="Limpar busca"
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
