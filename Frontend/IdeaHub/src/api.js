/* Talks to the backend. Set VITE_API_URL in .env if the server is elsewhere. */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

/* A login stays valid for 2 days, even if the tab or browser is closed. */
export const SESSION_DAYS = 2
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

export class ApiError extends Error {
  constructor(message, status = 0, fields = null) {
    super(message)
    this.status = status
    this.fields = fields        // { email: 'Email already in use.', ... } from the server
  }
}

/* ---------- session (token + user + expiry) ---------- */
function readStore(store) {
  const token = store.getItem('token')
  if (!token) return null
  const expiresAt = Number(store.getItem('expiresAt')) || 0
  if (Date.now() >= expiresAt) return null        // expired
  let user = null
  try { user = JSON.parse(store.getItem('user')) } catch { /* corrupted, treat as no user */ }
  return { token, user, expiresAt }
}

/* Returns { token, user, expiresAt } if there is a valid, unexpired session; otherwise clears and returns null. */
export function getSession() {
  const session = readStore(localStorage) || readStore(sessionStorage)
  if (!session) clearSession()
  return session
}

export const getToken = () => getSession()?.token || null
export const getUser = () => getSession()?.user || null
export const isAuthenticated = () => !!getSession()

/* "Remember me" (default on) keeps you signed in for 2 days via localStorage.
   Turned off, the session lives only until the tab is closed. */
export function saveSession({ token, user }, remember = true) {
  clearSession()
  const store = remember ? localStorage : sessionStorage
  store.setItem('token', token)
  store.setItem('user', JSON.stringify(user))
  store.setItem('expiresAt', String(Date.now() + SESSION_MS))
}

export function clearSession() {
  ;['token', 'user', 'expiresAt'].forEach((k) => {
    localStorage.removeItem(k)
    sessionStorage.removeItem(k)
  })
}

/* ---------- request helper ----------
   body can be a plain object (sent as JSON) or FormData (sent as is, for file uploads).
   Returns the "data" part of the response, or throws ApiError with a readable message. */
export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  let payload
  if (body instanceof FormData) {
    payload = body                                  // browser sets the multipart header itself
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const token = auth ? getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(API_URL + path, { method, headers, body: payload })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.')
  }

  const json = await res.json().catch(() => ({}))

  // Server says the token is bad or expired -> drop the session and send the user to login.
  if (res.status === 401 && auth) {
    clearSession()
    window.dispatchEvent(new Event('auth:logout'))
  }

  if (!res.ok) {
    throw new ApiError(json?.error?.message || 'Something went wrong. Please try again.', res.status, json?.error?.fields)
  }
  return json.data
}