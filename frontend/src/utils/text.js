export function normalizeMojibakeText(value) {
  const text = String(value ?? '')
  if (!text) return ''

  let normalized = text

  // Common double-encoding patterns (e.g. "MarÃ§o" -> "Março").
  for (let i = 0; i < 3; i += 1) {
    if (!/[ÃÂâ]/.test(normalized)) break
    try {
      const decoded = decodeURIComponent(escape(normalized))
      if (!decoded || decoded === normalized) break
      normalized = decoded
    } catch {
      break
    }
  }

  const replacements = [
    [/MarÃ§o/g, 'Março'],
    [/MÃªs/g, 'Mês'],
    [/PrÃ³ximo/g, 'Próximo'],
    [/ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢|Ã¢â‚¬Â¢|Ã¢â‚¬â€¢|â€¢|•/g, '-'],
    [/ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“|Ã¢Å“â€œ|âœ“|✓/g, '✓'],
    [/ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¢|âœ•|✕|✖/g, 'X'],
    [/â€”|â€“/g, '-']
  ]

  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement)
  }

  return normalized
}
