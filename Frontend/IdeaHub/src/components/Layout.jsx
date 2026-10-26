import { useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Header from '../nav/Header'
import Sidebar from '../Sidebar'
import { initialNotifications, unreadMessages } from '../data/mockData'
import { api, getUser, clearSession } from '../api'
import { shapeUser } from '../lib/shape'

/* Owns the notifications state so the sidebar badge, the header dot and the
   Notifications page always agree. Pages read it with useOutletContext(). */
export default function Layout() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(initialNotifications)
  const unread = notifications.filter((n) => n.unread).length

  // Start with the user saved at login, so the header is correct immediately
  const [rawUser, setRawUser] = useState(() => getUser() || {})

  // Then refresh from the database (picks up profile picture, occupation, etc.).
  // If the route doesn't exist yet, the saved login user is kept.
  useEffect(() => {
    let cancelled = false
    api('/users/me', { auth: true })
      .then((me) => {
        if (!cancelled && me) setRawUser((prev) => ({ ...prev, ...(me.user || me) }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // { name, initials, role, avatar, ... } built from firstname/lastname/occupation
  const user = useMemo(() => shapeUser(rawUser), [rawUser])

  const logout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <Header user={user} hasUnread={unread > 0} />
      <div className="app__body">
        <Sidebar unreadMessages={unreadMessages} unreadNotifications={unread} />
        <main className="app__main">
          <Outlet context={{ user, logout, notifications, setNotifications }} />
        </main>
      </div>
    </div>
  )
}