import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Bell, CheckCheck, Check, Heart, MessageCircle, UserPlus, Rocket, Bookmark, MoreHorizontal } from 'lucide-react'


const typeMeta = {
  like: { icon: Heart, tone: 'rose' },
  note: { icon: MessageCircle, tone: 'lavender' },
  follow: { icon: UserPlus, tone: 'sage' },
  milestone: { icon: Rocket, tone: 'sand' },
  save: { icon: Heart, tone: 'rose' },
  mention: { icon: MessageCircle, tone: 'lavender' },
}

const tabs = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'mentions', label: 'Mentions', match: (n) => n.type === 'note' || n.type === 'mention' },
  { id: 'projects', label: 'Projects', match: (n) => n.link },
  { id: 'unread', label: 'Unread', match: (n) => n.unread },
]

export default function Notifications() {
  const { notifications, setNotifications } = useOutletContext()
  const [tab, setTab] = useState('all')

  const unread = notifications.filter((n) => n.unread).length
  const active = tabs.find((t) => t.id === tab)
  const visible = notifications.filter(active.match)

  const markRead = (id) => setNotifications((list) => list.map((n) => (n.id === id ? { ...n, unread: false } : n)))
  const markAll = () => setNotifications((list) => list.map((n) => ({ ...n, unread: false })))

  return (
    <section className="page">
      <div className="page__head">
        <div>
          <p className="eyebrow">The good things happening</p>
          <h1 className="page__title">Notifications</h1>
          <p className="page__sub">A little signal from the people and projects you care about.</p>
        </div>
        <button type="button" className="btn btn--outline" onClick={markAll} disabled={unread === 0}>
          <CheckCheck size={15} aria-hidden="true" /> Mark all read
        </button>
      </div>

      <div className="summary" role="status">
        <p className="summary__text">
          <Bell size={14} aria-hidden="true" />
          <span><strong>{unread} unread {unread === 1 ? 'update is' : 'updates are'}</strong> waiting when you are.</span>
        </p>
        <span className="summary__count" aria-hidden="true">{String(unread).padStart(2, '0')}</span>
      </div>

      <div className="tabs" role="tablist" aria-label="Filter notifications">
        {tabs.map((t) => (
          <button
            key={t.id} type="button" role="tab"
            aria-selected={t.id === tab}
            className={'tab' + (t.id === tab ? ' is-active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}{t.id === 'unread' && <span className="tab__count"> {unread}</span>}
          </button>
        ))}
      </div>

      <ul className="notifs">
        {visible.map((n) => {
          const { icon: Icon, tone } = typeMeta[n.type]
          return (
            <li key={n.id} className="notif">
              <span className={`notif__icon tone--${tone}`}><Icon size={18} aria-hidden="true" /></span>
              <div className="notif__body">
                <p className="notif__title">
                  {n.title}
                  {n.unread && <span className="notif__dot" aria-label="Unread" />}
                </p>
                <p className="notif__meta">
                  {n.meta}{n.link && <> <Link to="/trending" className="notif__link">Open project</Link></>}
                </p>
              </div>
              <span className="notif__time">{n.time}</span>
              {n.unread ? (
                <button type="button" className="icon-btn" aria-label={`Mark "${n.title}" as read`} onClick={() => markRead(n.id)}>
                  <Check size={15} aria-hidden="true" />
                </button>
              ) : (
                <button type="button" className="icon-btn icon-btn--ghost" aria-label="More options">
                  <MoreHorizontal size={16} aria-hidden="true" />
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {visible.length === 0 && <p className="empty">You're all caught up.</p>}
    </section>
  )
}