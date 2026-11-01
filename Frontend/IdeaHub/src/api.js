                                   
const API_URL = import.meta.env.VITE_API_URL || 'https://ideahub-web.onrender.com/api'

export class ApiError extends Error {
  constructor(message, status = 0, fields = null) {
    super(message)
    this.status = status
    this.fields = fields       
  }
}


const SESSION_MS = 2 * 24 * 60 * 60 * 1000          
const read = (k) => localStorage.getItem(k) || sessionStorage.getItem(k)

export const getToken = () => read('token')

export function saveSession({ token, user }, remember = true) {
  clearSession()
  const store = remember ? localStorage : sessionStorage   
  store.setItem('token', token)
  store.setItem('user', JSON.stringify(user))
  store.setItem('expiresAt', String(Date.now() + SESSION_MS))
}


export const getUser = () => {
  try { return JSON.parse(read('user') || 'null') } catch { return null }
}


export const getSession = () => {
  const token = getToken()
  if (!token) return null
  const expiresAt = Number(read('expiresAt')) || Date.now() + SESSION_MS  
  if (expiresAt <= Date.now()) { clearSession(); return null }
  return { token, user: getUser(), expiresAt }
}

export const isAuthenticated = () => !!getSession()

export function clearSession() {
  ;['token', 'user', 'expiresAt'].forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k) })
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
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`

  let res
  try {
    res = await fetch(API_URL + path, { method, headers, body: payload })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.')
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
  
    if (res.status === 401 && auth) {
      clearSession()
      window.dispatchEvent(new Event('auth:logout'))    
    }
    throw new ApiError(json?.error?.message || 'Something went wrong. Please try again.', res.status, json?.error?.fields)
  }
  return json.data
}

/* ---------- uploaded files ----------
   The server stores paths like "/uploads/ab12.jpg". The browser needs the full address,
   which is the API address without the trailing "/api". */
const FILES_ORIGIN = API_URL.replace(/\/api\/?$/, '')
export const assetUrl = (p) => (!p ? '' : /^https?:\/\//i.test(p) ? p : FILES_ORIGIN + p)