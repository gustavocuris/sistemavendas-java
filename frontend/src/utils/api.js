const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').trim()

export const API_ORIGIN = rawApiUrl
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '')

export const API_BASE = `${API_ORIGIN}/api`

export const apiUrl = (path = '') => {
  const normalizedPath = String(path || '')
  if (!normalizedPath) return API_BASE
  const withSlash = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`

  if (withSlash === '/api' || withSlash.startsWith('/api/')) {
    return `${API_ORIGIN}${withSlash}`
  }

  return `${API_BASE}${withSlash}`
}
