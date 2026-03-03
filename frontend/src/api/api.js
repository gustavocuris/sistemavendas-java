import axios from 'axios'

console.log('API BASE URL:', import.meta.env.VITE_API_URL)

const resolveApiBase = () => String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')

export const API_BASE = resolveApiBase()
export const API_ORIGIN = API_BASE

export const apiUrl = (path = '') => {
  const normalizedPath = String(path || '')
  if (!normalizedPath) return API_BASE

  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath
  const withLeadingSlash = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  return `${API_BASE}${withLeadingSlash}`
}

const api = axios.create({
  baseURL: API_BASE
})

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('currentUser')
    const user = raw ? JSON.parse(raw) : null
    config.headers = config.headers || {}

    if (user?.id) {
      config.headers['x-user-id'] = user.id
    }

    if (user?.role) {
      config.headers['x-user-role'] = user.role
    }

    if (import.meta.env.DEV) {
      console.debug('Sending x-user-id:', user?.id, 'to', config.url)
    }
  } catch {
    // no-op
  }
  return config
})

export const runHealthCheck = async () => {
  if (!API_BASE) {
    console.warn('[HEALTH] VITE_API_URL não configurada; health check ignorado.')
    return null
  }

  const response = await api.get('/health')
  console.log('[HEALTH] GET', `${API_BASE}/health`, response.data)
  return response.data
}

export default api
