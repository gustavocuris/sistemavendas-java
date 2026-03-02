export function normalizeMojibakeText(value) {
  const text = String(value ?? '')
  if (!text) return ''

  const suspicious = /[ÃÂâ�]/.test(text)
  if (!suspicious) return text

  try {
    const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff)
    const decoded = new TextDecoder('utf-8').decode(bytes)
    const score = (input) => (String(input).match(/[ÃÂâ�]/g) || []).length
    return score(decoded) <= score(text) ? decoded : text
  } catch {
    return text
  }
}
