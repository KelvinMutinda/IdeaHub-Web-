import { NavLink, Link, useLocation } from 'react-router-dom'
import { Home, MessageCircle, Bell, TrendingUp, Star, LayoutDashboard, Sparkles, ArrowUpRight } from 'lucide-react'

const promos = {
  default: { text: 'Make room for the people who get it.', cta: 'Meet the community', to: '/trending' },
  '/trending': { text: 'Follow the work that sparks something.', cta: 'See community favorites', to: '/top-rated' },
  '/top-rated': { text: 'Follow the work that sparks something.', cta: 'See what is trending', to: '/trending' },
  '/dashboard': { text: 'See what your small steps set in motion.', cta: 'Find your next spark', to: '/trending' },
}

export default function Sidebar({ unreadMessages, unreadNotifications }) {
  const { pathname } = useLocation()
  const promo = promos[pathname] ?? promos.default

  const items = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/messenger', label: 'Messenger', icon: MessageCircle, badge: unreadMessages },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { to: '/trending', label: 'Trending', icon: TrendingUp },
    { to: '/top-rated', label: 'Top rated', icon: Star },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]

  return (
    <aside className="sidebar">
      <nav aria-label="Workspace">
        <p className="sidebar__label">Workspace</p>
        <ul className="sidebar__list">
          {items.map(({ to, label, icon: Icon, end, badge }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={({ isActive }) => 'sidebar__link' + (isActive ? ' is-active' : '')}>
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
                {badge > 0 && <span className="sidebar__badge" aria-label={`${badge} unread`}>{badge}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="promo">
        <Sparkles size={18} aria-hidden="true" />
        <h2 className="promo__title">Good things grow together.</h2>
        <p className="promo__text">{promo.text}</p>
        <Link to={promo.to} className="promo__link">
          {promo.cta} <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  )
}