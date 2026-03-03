import axios from 'axios'

console.log('API BASE URL:', import.meta.env.VITE_API_URL)

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

    if (user?.id === '1' && String(user?.role || '').toLowerCase() === 'admin') {
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
