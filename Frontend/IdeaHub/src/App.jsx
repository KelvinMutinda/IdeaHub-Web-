import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { getSession, clearSession, isAuthenticated } from './api'
import Layout from './components/Layout'
import Dashboard from './Dashboard'
import Trending from './Trending'
import TopRated from './Toprated'
import Notifications from './Notification'
import ComingSoon from './ComingSoon'
import Home from './Home'
import './App.css'
import Messenger from './Messenger.jsx'
import Register from './auth/Register.jsx'
import Login from './auth/Login.jsx'

/
function RequireAuth() {
  const location = useLocation()
  const [session, setSession] = useState(() => getSession())

  // api.js fires this when the server answers 401 (bad or expired token)
  useEffect(() => {
    const onLogout = () => setSession(null)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  // Sign out automatically at the moment the 2 days run out
  useEffect(() => {
    if (!session) return
    const ms = session.expiresAt - Date.now()
    const id = setTimeout(() => setSession(null), Math.min(ms, 2 ** 31 - 1))
    return () => clearTimeout(id)
  }, [session])

  if (!session) {
    clearSession()
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

/* Already signed in? Skip the login / register pages. */
function PublicOnly({ children }) {
  return isAuthenticated() ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />

      {/* Everything below requires a valid session */}
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/messenger" element={<Messenger />} />
          <Route path="/messenger/:conversationId" element={<Messenger />} />
          <Route index element={<Home />} />
          <Route path="messenger" element={<ComingSoon title="Messenger" />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="trending" element={<Trending />} />
          <Route path="top-rated" element={<TopRated />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
