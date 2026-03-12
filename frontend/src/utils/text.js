export function normalizeMojibakeText(value) {
  const text = String(value ?? '')
  if (!text) return ''

  let normalized = text

  // Common double-encoding pattern (e.g. "MarÃ§o" -> "Março").
  if (/[ÃÂâ]/.test(normalized)) {
    try {
      normalized = decodeURIComponent(escape(normalized))
    } catch {
      // Ignore decode failures and keep best-effort replacements below.
    }
  }

  const replacements = [
    [/MarÃ§o/g, 'Março'],
    [/MÃªs/g, 'Mês'],
    [/PrÃ³ximo/g, 'Próximo'],
    [/Ã¢â‚¬Â¢|Ã¢â‚¬â€¢|â€¢|•/g, '-'],
    [/Ã¢Å“â€œ|âœ“/g, '✓'],
    [/âœ•/g, 'X'],
    [/â€”|â€“/g, '-']
  ]

  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement)
  }

  return normalized
}
