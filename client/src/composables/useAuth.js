import { computed, reactive, readonly } from 'vue'

import { getCurrentUser, login as loginRequest, register as registerRequest } from '../api/authApi'
import { getStoredToken, setStoredToken } from '../api/fetchClient'

const authState = reactive({
  initialized: false,
  loading: false,
  token: getStoredToken(),
  user: null,
})

export function useAuth() {
  async function initAuth() {
    if (authState.initialized) {
      return authState.user
    }

    if (!authState.token) {
      authState.initialized = true
      return null
    }

    try {
      const response = await getCurrentUser()
      authState.user = normalizeUser(response.user)
    } catch (error) {
      clearAuth()
    } finally {
      authState.initialized = true
    }

    return authState.user
  }

  async function login(credentials) {
    authState.loading = true

    try {
      const response = await loginRequest(credentials)
      setSession(response.token, response.user)
      return authState.user
    } finally {
      authState.loading = false
    }
  }

  async function register(payload) {
    authState.loading = true

    try {
      const response = await registerRequest(payload)
      setSession(response.token, response.user)
      return authState.user
    } finally {
      authState.loading = false
    }
  }

  async function refreshProfile() {
    if (!authState.token) {
      clearAuth()
      return null
    }

    const response = await getCurrentUser()
    authState.user = normalizeUser(response.user)
    return authState.user
  }

  function logout() {
    clearAuth()
  }

  return {
    state: readonly(authState),
    user: computed(() => authState.user),
    token: computed(() => authState.token),
    isAuthenticated: computed(() => Boolean(authState.user && authState.token)),
    isOrganizer: computed(() => authState.user?.role === 'organizer'),
    isParticipant: computed(() => authState.user?.role === 'participant'),
    initAuth,
    login,
    register,
    refreshProfile,
    logout,
  }
}

function setSession(token, user) {
  authState.token = token
  authState.user = normalizeUser(user)
  authState.initialized = true
  setStoredToken(token)
}

function clearAuth() {
  authState.token = null
  authState.user = null
  authState.initialized = true
  setStoredToken(null)
}

function normalizeUser(user) {
  if (!user) {
    return null
  }

  return {
    id: Number(user.id),
    email: user.email,
    displayName: user.displayName || user.display_name,
    role: user.role,
  }
}
