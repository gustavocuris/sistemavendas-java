import axios from 'axios'

const DEPLOY_MARKER = 'deploy-2026-03-03-4'

console.log('API BASE URL:', import.meta.env.VITE_API_URL)
console.log('DEPLOY MARKER:', DEPLOY_MARKER)

export function endpoint(path) {
  const value = String(path || '')
  return value.startsWith('/') ? value : `/${value}`
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
})

api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('currentUser')
    let user = raw ? JSON.parse(raw) : null

    if (String(user?.role || '').toLowerCase() === 'admin' && (!user?.id || user.id === '1' || user.id !== 'adm')) {
      user = { ...user, id: 'adm' }
      localStorage.setItem('currentUser', JSON.stringify(user))
    }

    config.headers = config.headers || {}

    if (user?.id) {
      config.headers['x-user-id'] = user.id
    }

    if (user?.role) {
      config.headers['x-user-role'] = user.role
    }

    console.log('REQUEST FINAL URL:', `${config.baseURL || ''}${config.url || ''}`)
  } catch {
    // no-op
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config || {}
    const status = error?.response?.status
    const originalUrl = String(config.url || '')

    if (
      status === 404 &&
      !config._apiPrefixRetry &&
      originalUrl &&
      !originalUrl.startsWith('/api/')
    ) {
      config._apiPrefixRetry = true
      config.url = originalUrl.startsWith('/') ? `/api${originalUrl}` : `/api/${originalUrl}`
      console.warn('404 fallback retry URL:', `${config.baseURL || ''}${config.url}`)
      return api.request(config)
    }

    return Promise.reject(error)
  }
)

export const runHealthCheck = async () => {
  if (!import.meta.env.VITE_API_URL) {
    console.warn('[HEALTH] VITE_API_URL não configurada; health check ignorado.')
    return null
  }

  const response = await api.get(endpoint('health'))
  console.log('[HEALTH] GET', `${import.meta.env.VITE_API_URL}/health`, response.data)
  return response.data
}

export default api
