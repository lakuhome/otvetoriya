const API_URL = import.meta.env.VITE_API_URL || '/api'
const AUTH_TOKEN_KEY = 'otvetoriya_token'

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code || 'INTERNAL_ERROR'
  }
}

export async function apiRequest(path, options = {}) {
  const token = options.token || localStorage.getItem(AUTH_TOKEN_KEY)
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    const error = payload?.error || {}
    throw new ApiError(response.status, error.message || 'Request failed', error.code)
  }

  return payload
}

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    return
  }

  localStorage.removeItem(AUTH_TOKEN_KEY)
}
