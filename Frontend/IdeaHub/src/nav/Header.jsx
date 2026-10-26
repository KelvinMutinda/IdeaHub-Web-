import { Link, useLocation } from 'react-router-dom'
import { Search, Bell, Sparkles } from 'lucide-react'

const placeholders = {
  '/trending': 'Search projects, people, or tech...',
  '/top-rated': 'Search top rated projects...',
  '/notifications': 'Search notifications...',
  '/dashboard': 'Search your projects...',
}

export default function Header({ user, hasUnread }) {
  const { pathname } = useLocation()
  const placeholder = placeholders[pathname] ?? 'Search projects, people, or tech...'

  return (
    <header className="header">
      <Link to="/" className="header__brand" aria-label="IdeaHub home">
        <span className="header__mark"><Sparkles size={20} aria-hidden="true" /></span>
        <span className="header__word">ideahub</span>
      </Link>

      <label className="header__search">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">Search</span>
        <input type="search" placeholder={placeholder} />
      </label>

      <div className="header__actions">
        <Link
          to="/notifications"
          className="header__bell"
          aria-label={hasUnread ? 'Notifications, you have unread updates' : 'Notifications'}
        >
          <Bell size={18} aria-hidden="true" />
          {hasUnread && <span className="header__dot" aria-hidden="true" />}
        </Link>
        <div className="header__user">
          <span className="avatar avatar--peach">{user.initials}</span>
          <span className="header__user-text">
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </span>
        </div>
      </div>
    </header>
  )
}