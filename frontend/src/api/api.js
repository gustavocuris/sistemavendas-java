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
    if (user?.id) {
      config.headers = config.headers || {}
      config.headers['x-user-id'] = user.id
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

  const healthUrl = `${API_BASE}/health`
  const response = await axios.get(healthUrl)
  console.log('[HEALTH] GET', healthUrl, response.data)
  return response.data
}

export default api
