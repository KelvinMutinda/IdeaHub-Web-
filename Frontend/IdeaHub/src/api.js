
const API_URL = import.meta.env.VITE_API_URL || 'http://https://ideahub-web.onrender.com/api'

export class ApiError extends Error {
  constructor(message, status = 0, fields = null) {
    super(message)
    this.status = status
    this.fields = fields        
  }
}

export const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token')

export function saveSession({ token, user }, remember = true) {
  clearSession()
  const store = remember ? localStorage : sessionStorage    
  store.setItem('token', token)
  store.setItem('user', JSON.stringify(user))
}

export function clearSession() {
  ;['token', 'user'].forEach((k) => { localStorage.removeItem(k); sessionStorage.removeItem(k) })
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
    throw new ApiError(json?.error?.message || 'Something went wrong. Please try again.', res.status, json?.error?.fields)
  }
  return json.data
}

const FILES_ORIGIN = API_URL.replace(/\/api\/?$/, '')
export const assetUrl = (p) => (!p ? '' : /^https?:\/\//i.test(p) ? p : FILES_ORIGIN + p)