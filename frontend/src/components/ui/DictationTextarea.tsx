import { Mic, MicOff, Square } from 'lucide-react'
import { forwardRef, useRef, type TextareaHTMLAttributes } from 'react'
import { dictationAvailability, useDictation } from '../../lib/dictation/use-dictation'
import { joinDictatedChunk } from '../../lib/dictation/voice-commands'
import { Textarea } from './Field'

/**
 * Altera o valor do campo como se a pessoa tivesse digitado, disparando o evento
 * "input" — assim o react-hook-form e os estados controlados do React percebem a mudança.
 */
function setNativeValue(element: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

type DictationTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

/** Textarea com botão de microfone: o texto ditado entra na posição do cursor. */
export const DictationTextarea = forwardRef<HTMLTextAreaElement, DictationTextareaProps>(function DictationTextarea(
  { className = '', disabled, onSelect, ...props },
  forwardedRef,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  // Posição onde o próximo trecho ditado será inserido
  const caretRef = useRef<number | null>(null)
  const available = dictationAvailability() === 'available'

  const { listening, interim, error, start, stop, clearError } = useDictation((chunk) => {
    const element = textareaRef.current
    if (!element) return
    const position = Math.min(caretRef.current ?? element.value.length, element.value.length)
    const { before, insert } = joinDictatedChunk(element.value.slice(0, position), chunk)
    if (!insert) return
    const after = element.value.slice(position)
    setNativeValue(element, before + insert + after)
    caretRef.current = before.length + insert.length
    if (document.activeElement === element) element.setSelectionRange(caretRef.current, caretRef.current)
  })

  function toggle() {
    if (listening) {
      stop()
      return
    }
    clearError()
    const element = textareaRef.current
    // Começa onde o cursor estava; sem cursor definido, no fim do texto
    caretRef.current = element ? element.selectionEnd ?? element.value.length : null
    start()
  }

  const setRefs = (node: HTMLTextAreaElement | null) => {
    textareaRef.current = node
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  const label = listening ? 'Parar ditado' : available ? 'Ditar por voz' : 'Ditado indisponível neste navegador'

  return (
    <div className="space-y-1">
      <div className="relative">
        <Textarea
          ref={setRefs}
          disabled={disabled}
          // Durante o ditado, clicar em outro ponto do texto muda onde o próximo trecho entra
          onSelect={(event) => {
            if (listening) caretRef.current = event.currentTarget.selectionEnd
            onSelect?.(event)
          }}
          className={`pr-14 ${listening ? 'border-destructive ring-3 ring-destructive/15' : ''} ${className}`}
          {...props}
        />
        {!disabled && (
          <button
            type="button"
            onClick={toggle}
            aria-label={label}
            aria-pressed={listening}
            title={label}
            className={`absolute bottom-1.5 right-1.5 flex size-11 items-center justify-center rounded-lg transition-colors duration-150 print:hidden ${
              listening
                ? 'bg-destructive text-white hover:bg-red-700'
                : available
                  ? 'text-muted-foreground hover:bg-muted hover:text-primary'
                  : 'text-muted-foreground/50 hover:bg-muted'
            }`}
          >
            {listening ? (
              <Square className="size-4 fill-current" aria-hidden="true" />
            ) : available ? (
              <Mic className="size-5" aria-hidden="true" />
            ) : (
              <MicOff className="size-5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {listening && (
        <p role="status" className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="mt-1.5 size-2 shrink-0 animate-pulse rounded-full bg-destructive" aria-hidden="true" />
          <span>
            <span className="font-medium text-foreground">Ouvindo…</span>
            {interim && <span className="italic"> {interim}</span>}
          </span>
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
})
