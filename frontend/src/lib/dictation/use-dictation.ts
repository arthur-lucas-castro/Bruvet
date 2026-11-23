import { useCallback, useEffect, useRef, useState } from 'react'

/*
 * Ditado com a Web Speech API do navegador (Chrome, Edge e Safari; o Firefox não tem).
 * Para trocar por outro motor (ex.: Whisper no servidor), basta manter a mesma
 * interface deste hook: start/stop, texto parcial (interim) e trechos finais (onFinal).
 */

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } }
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> }
type RecognitionErrorEvent = { error: string }

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type RecognitionConstructor = new () => Recognition

function getRecognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type DictationAvailability = 'available' | 'unsupported' | 'insecure'

/** O microfone só funciona em HTTPS ou em localhost. */
export function dictationAvailability(): DictationAvailability {
  if (!getRecognitionConstructor()) return 'unsupported'
  if (!window.isSecureContext) return 'insecure'
  return 'available'
}

export const AVAILABILITY_MESSAGES: Record<Exclude<DictationAvailability, 'available'>, string> = {
  unsupported: 'Ditado por voz indisponível neste navegador. Use Chrome ou Edge.',
  insecure: 'O ditado por voz exige conexão segura (HTTPS). Peça ao responsável técnico para ativar.',
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Permissão do microfone negada. Libere o microfone para este site nas configurações do navegador.',
  'service-not-allowed': 'O navegador bloqueou o serviço de reconhecimento de voz.',
  'audio-capture': 'Nenhum microfone encontrado. Verifique se ele está conectado.',
  network: 'Sem conexão com o serviço de reconhecimento de voz. Verifique a internet.',
  'language-not-supported': 'O reconhecimento de voz em português não está disponível neste navegador.',
}

/** Só um campo dita por vez: começar em outro encerra o anterior. */
let activeSession: { stop: () => void } | null = null

export function useDictation(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<Recognition | null>(null)
  // A pessoa quer continuar ditando? (o navegador encerra sozinho após silêncio; reiniciamos)
  const wantedRef = useRef(false)
  const onFinalRef = useRef(onFinal)

  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])

  const stop = useCallback(() => {
    wantedRef.current = false
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    const availability = dictationAvailability()
    if (availability !== 'available') {
      setError(AVAILABILITY_MESSAGES[availability])
      return
    }
    const Ctor = getRecognitionConstructor()!

    activeSession?.stop()
    setError(null)

    const recognition = new Ctor()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let partial = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) onFinalRef.current(result[0].transcript)
        else partial += result[0].transcript
      }
      setInterim(partial)
    }

    recognition.onerror = (event) => {
      // Silêncio e cancelamento manual não são erros para a pessoa
      if (event.error === 'no-speech' || event.error === 'aborted') return
      wantedRef.current = false
      setError(ERROR_MESSAGES[event.error] ?? 'O ditado foi interrompido. Tente novamente.')
    }

    recognition.onend = () => {
      if (wantedRef.current) {
        try {
          recognition.start()
          return
        } catch {
          wantedRef.current = false
        }
      }
      setListening(false)
      setInterim('')
      if (activeSession === session) activeSession = null
    }

    const session = { stop }
    activeSession = session
    recognitionRef.current = recognition
    wantedRef.current = true
    try {
      recognition.start()
      setListening(true)
    } catch {
      wantedRef.current = false
      setError('Não foi possível iniciar o microfone.')
    }
  }, [stop])

  // Ao sair da tela, encerra o microfone
  useEffect(
    () => () => {
      wantedRef.current = false
      recognitionRef.current?.abort()
    },
    [],
  )

  return { listening, interim, error, start, stop, clearError: () => setError(null) }
}
