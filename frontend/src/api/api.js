import axios from 'axios'

const resolveApiOrigin = () => {
  const envApi = String(import.meta.env.VITE_API_URL || '').trim()
  const defaultOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const resolved = envApi || defaultOrigin

  return resolved
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '')
}

export const API_ORIGIN = resolveApiOrigin()
export const API_BASE = `${API_ORIGIN}/api`

export const apiUrl = (path = '') => {
  const normalizedPath = String(path || '')
  if (!normalizedPath) return API_BASE

  const withLeadingSlash = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  if (withLeadingSlash.startsWith('/api/')) return `${API_ORIGIN}${withLeadingSlash}`
  if (withLeadingSlash === '/api') return `${API_ORIGIN}/api`
  return `${API_BASE}${withLeadingSlash}`
}

const api = axios.create({
  baseURL: API_ORIGIN
})

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('currentUser')
    const user = raw ? JSON.parse(raw) : null
    if (user?.id) {
      config.headers = config.headers || {}
      config.headers['x-user-id'] = user.id
    }
  } catch {
    // no-op
  }
  return config
})

export default api
