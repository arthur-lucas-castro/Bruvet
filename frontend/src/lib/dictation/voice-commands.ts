/**
 * Comandos de pontuação falados e montagem do texto ditado.
 * O reconhecimento em português quase não pontua sozinho, então a pessoa dita
 * "vírgula", "ponto final", "nova linha"...
 */

/** Ordem importa: comandos compostos ("ponto e vírgula") antes dos simples ("vírgula"). */
const COMMANDS: [RegExp, string][] = [
  [/\bponto e v[íi]rgula\b/gi, ';'],
  [/\bponto de interroga[çc][ãa]o\b|\binterroga[çc][ãa]o\b/gi, '?'],
  [/\bponto de exclama[çc][ãa]o\b|\bexclama[çc][ãa]o\b/gi, '!'],
  [/\bdois pontos\b/gi, ':'],
  [/\bponto final\b/gi, '.'],
  [/\bnovo par[áa]grafo\b|\bpar[áa]grafo\b/gi, '\n\n'],
  [/\bnova linha\b|\bpr[óo]xima linha\b/gi, '\n'],
  [/\bv[íi]rgula\b/gi, ','],
  [/\babre par[êe]nteses\b/gi, '('],
  [/\bfecha par[êe]nteses\b/gi, ')'],
  // "ponto" sozinho só vira pontuação no fim da fala, para não trocar "ponto de dor"
  [/\bponto\s*$/gi, '.'],
]

/** Lista exibida na ajuda do ditado. */
export const VOICE_COMMAND_HELP: [string, string][] = [
  ['vírgula', ','],
  ['ponto final', '.'],
  ['dois pontos', ':'],
  ['ponto e vírgula', ';'],
  ['interrogação', '?'],
  ['nova linha', '↵'],
  ['parágrafo', '↵↵'],
  ['abre / fecha parênteses', '( )'],
]

function applyCommands(text: string): string {
  let result = text
  for (const [pattern, replacement] of COMMANDS) result = result.replace(pattern, replacement)
  return (
    result
      // Sem espaço antes de pontuação e de fechamento de parênteses
      .replace(/[ \t]+([,.;:?!)])/g, '$1')
      // Sem espaço depois de abrir parênteses
      .replace(/\([ \t]+/g, '(')
      // Um espaço depois de pontuação seguida de texto
      .replace(/([,.;:?!])(?=[^\s,.;:?!)])/g, '$1 ')
      // Quebras de linha sem espaços ao redor
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
  )
}

const capitalize = (s: string) => s.replace(/^(\s*)(\p{L})/u, (_, space, letter: string) => space + letter.toUpperCase())

/**
 * Prepara um trecho ditado para ser inserido depois de `before` (o texto à esquerda
 * do cursor). Devolve o `before` ajustado (sem espaço sobrando antes de pontuação)
 * e o texto a inserir, com espaço e maiúscula no lugar certo.
 */
export function joinDictatedChunk(before: string, rawChunk: string): { before: string; insert: string } {
  let chunk = applyCommands(rawChunk.trim())
  if (!chunk) return { before, insert: '' }

  const startsWithPunctuation = /^[,.;:?!)]/.test(chunk)
  const startsWithBreak = chunk.startsWith('\n')
  let left = before

  if (startsWithPunctuation || startsWithBreak) {
    // "febre" + ", vômito" → "febre, vômito"
    left = left.replace(/[ \t]+$/, '')
  } else if (left && !/\s$/.test(left) && !/\($/.test(left)) {
    chunk = ' ' + chunk
  }

  // Maiúscula no início do texto, depois de fim de frase e depois de quebra de linha
  const startsSentence = left.trim() === '' || /[.?!]\s*$/.test(left) || /\n\s*$/.test(left)
  if (startsSentence) chunk = capitalize(chunk)
  chunk = chunk.replace(/([.?!]\s+|\n)(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase())

  return { before: left, insert: chunk }
}
