export function normalizeMojibakeText(value) {
  const text = String(value ?? '')
  if (!text) return ''

  const knownReplacements = [
    ['MarÃ§o', 'Março'],
    ['MÃªs', 'Mês'],
    ['PrÃ³ximo', 'Próximo'],
    ['ÃREA', 'ÁREA'],
    ['ÃšLTIMAS', 'ÚLTIMAS'],
    ['SERVIÃOS', 'SERVIÇOS'],
    ['âœ•', '✕'],
    ['âœ”', '✓'],
    ['â€¢', '•'],
    ['â€“', '–'],
    ['â€”', '—']
  ]

  let normalized = text
  for (const [broken, fixed] of knownReplacements) {
    normalized = normalized.split(broken).join(fixed)
  }

  const stillSuspicious = /[ÃÂâ�]/.test(normalized)
  if (!stillSuspicious) return normalized

  try {
    const bytes = Uint8Array.from(normalized, (char) => char.charCodeAt(0) & 0xff)
    const decoded = new TextDecoder('utf-8').decode(bytes)
    const score = (input) => (String(input).match(/[ÃÂâ�]/g) || []).length
    return score(decoded) <= score(normalized) ? decoded : normalized
  } catch {
    return normalized
  }
}
