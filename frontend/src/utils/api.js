const FALLBACK_API_ORIGIN = 'https://sistemavendas-backend-intercap.onrender.com'
const rawApiUrl = String(import.meta.env.VITE_API_URL || '').trim()
const normalizedApiUrl = rawApiUrl
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '')

const isAbsoluteHttpUrl = /^https?:\/\//i.test(normalizedApiUrl)
const isLocalDev = typeof window !== 'undefined' && /localhost|127\.0\.0\.1/i.test(window.location.hostname)
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
const pointsToFrontendOrigin = Boolean(currentOrigin) && normalizedApiUrl.toLowerCase() === currentOrigin.toLowerCase()

export const API_ORIGIN = isAbsoluteHttpUrl
  ? (pointsToFrontendOrigin && !isLocalDev ? FALLBACK_API_ORIGIN : normalizedApiUrl)
  : (isLocalDev ? 'http://localhost:3001' : FALLBACK_API_ORIGIN)

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
