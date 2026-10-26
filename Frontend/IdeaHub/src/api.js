
const RAW_API_URL =
  import.meta.env.VITE_API_URL || 'https://ideahub-web.onrender.com/api'
const API_URL = RAW_API_URL.replace(/\/+$/, '')

export const SESSION_DAYS = 2
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000

export class ApiError extends Error {
  constructor(message, status = 0, fields = null) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

function readStore(store) {
  const token = store.getItem('token')
  if (!token) return null
  const expiresAt = Number(store.getItem('expiresAt')) || 0
  if (Date.now() >= expiresAt) return null
  let user = null
  try { user = JSON.parse(store.getItem('user')) } catch {  }
  return { token, user, expiresAt }
}


export function getSession() {
  const session = readStore(localStorage) || readStore(sessionStorage)
  if (!session) clearSession()
  return session
}

export const getToken = () => getSession()?.token || null
export const getUser = () => getSession()?.user || null
export const isAuthenticated = () => !!getSession()


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


export async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  let payload
  if (body instanceof FormData) {
    payload = body
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const token = auth ? getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  // Make sure exactly one slash sits between the base URL and the path.
  const url = API_URL + (path.startsWith('/') ? path : '/' + path)

  let res
  try {
    res = await fetch(url, { method, headers, body: payload })
  } catch (err) {
    // Logs the real reason (CORS, DNS, offline...) so it can be diagnosed in DevTools.
    console.error('Request failed:', method, url, err)
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
