import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Eye, Bookmark, Users, Heart, ArrowUpRight, ChartNoAxesColumn, Plus } from 'lucide-react'
import { api } from './api'
import { listOf } from './lib/shape'
import { shapeProject } from './lib/projects'

const icons = { eye: Eye, bookmark: Bookmark, users: Users, heart: Heart }
const ICON_BY_TYPE = { view: 'eye', save: 'bookmark', follow: 'users', like: 'heart' }
const TONES = ['sand', 'sage', 'rose']
const RANGE_LABEL = { week: 'this week', month: 'this month', year: 'this year' }
const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }

const toneFor = (s = '') => TONES[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length]
const initialsOf = (s = '') => s.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const fmt = (n) => Number(n || 0).toLocaleString('en-US')

const STAT_DEFS = [
  { key: 'views', label: 'Project views', icon: 'eye', tone: 'sage' },
  { key: 'saves', label: 'Saves', icon: 'bookmark', tone: 'sand' },
  { key: 'followers', label: 'New followers', icon: 'users', tone: 'rose' },
  { key: 'likes', label: 'Likes', icon: 'heart', tone: 'rose' },
]

/* Turns the server response into what the page draws */
function normalize(d = {}) {
  const stat = (key) => {
    const s = d.stats?.[key]
    return { value: typeof s === 'object' && s !== null ? s.value : s, delta: s?.delta }
  }
  return {
    stats: STAT_DEFS.map((def) => ({ ...def, ...stat(def.key) })),
    weekly: listOf(d.weekly, 'weekly').map((w) => ({ day: w.day || w.label, views: Number(w.views) || 0, saves: Number(w.saves) || 0 })),
    noticed: listOf(d.noticed, 'noticed').map((p) => ({
      id: p.id ?? p._id,
      title: p.title,
      stack: Array.isArray(p.stack) ? p.stack.join(' · ') : p.stack || '',
      views: Number(p.views) || 0,
      saves: Number(p.saves) || 0,
    })),
    activity: listOf(d.activity, 'activity').map((a, i) => ({
      id: a.id ?? a._id ?? i,
      icon: ICON_BY_TYPE[a.type] || a.icon || 'eye',
      tone: a.tone || 'sage',
      text: a.text,                // a string, or an array of strings / { b: 'bold part' }
      time: a.time || '',
    })),
    visitors: Number(d.visitors ?? d.stats?.views?.value ?? d.stats?.views) || 0,
  }
}

/* Uses GET /dashboard?range=... . If the backend doesn't have it yet (404),
   builds a basic version from the user's own posts so the page still works. */
async function fetchDashboard(range) {
  try {
    return normalize(await api(`/dashboard?range=${range}`, { auth: true }))
  } catch (err) {
    if (err.status !== 404) throw err
  }
  const mine = listOf(await api('/users/me/posts', { auth: true }).catch(() => []), 'posts').map(shapeProject)
  const likes = mine.reduce((n, p) => n + p.likes, 0)
  return normalize({
    stats: { likes },
    noticed: [...mine].sort((a, b) => b.likes - a.likes).slice(0, 4).map((p) => ({
      id: p.id, title: p.title, stack: p.tags.slice(0, 3), views: 0, saves: p.likes,
    })),
  })
}

export default function Dashboard() {
  const { user } = useOutletContext()
  const [range, setRange] = useState('week')
  const [data, setData] = useState(() => normalize())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchDashboard(range)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range])

  const { stats, weekly, noticed, activity, visitors } = data

  const firstName = user.firstName || user.firstname || user.name?.split(' ')[0] || ''
  const max = Math.max(1, ...weekly.flatMap((d) => [d.views, d.saves]))
  const peak = weekly.length ? weekly.reduce((a, b) => (b.views > a.views ? b : a)) : null
  const peakName = peak ? DAY_NAMES[peak.day] || peak.day : '—'

  return (
    <section className="page">
      <div className="page__head">
        <div>
          <p className="eyebrow">Your work, finding its people</p>
          <h1 className="page__title">A good week{firstName ? `, ${firstName}` : ''}.</h1>
          <p className="page__sub">Small signals add up. Here's what your projects are doing.</p>
        </div>
        <select className="range" aria-label="Time range" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
        </select>
      </div>

      {error && <p className="empty" role="alert">{error}</p>}

      <div className="stats" aria-busy={loading}>
        {stats.map((s) => {
          const Icon = icons[s.icon]
          return (
            <article key={s.key} className="stat">
              <div className="stat__top">
                <span className="stat__label">{s.label}</span>
                <span className={`stat__icon tone--${s.tone}`}><Icon size={16} aria-hidden="true" /></span>
              </div>
              <p className="stat__value">{loading ? '…' : fmt(s.value)}</p>
              {s.delta ? <p className="stat__delta"><ArrowUpRight size={12} aria-hidden="true" /> {s.delta}</p> : null}
            </article>
          )
        })}
      </div>

      <div className="row">
        <article className="card chart">
          <div className="card__head">
            <div>
              <h2 className="card__title">People are finding your work</h2>
              <p className="card__sub">Project views and saves · {RANGE_LABEL[range]}</p>
            </div>
            <ul className="legend">
              <li><span className="legend__dot legend__dot--views" /> Views</li>
              <li><span className="legend__dot legend__dot--saves" /> Saves</li>
            </ul>
          </div>

          {weekly.length === 0 ? (
            <p className="empty">{loading ? 'Loading…' : 'No views or saves yet for this period.'}</p>
          ) : (
            <div className="bars" role="img" aria-label={`Bar chart of views and saves. Peak: ${peakName}.`}>
              {weekly.map((d) => (
                <div key={d.day} className="bars__col">
                  <div className="bars__pair">
                    <span className="bar bar--views" style={{ height: `${(d.views / max) * 100}%` }} title={`${d.views} views`} />
                    <span className="bar bar--saves" style={{ height: `${(d.saves / max) * 100}%` }} title={`${d.saves} saves`} />
                  </div>
                  <span className="bars__day">{d.day}</span>
                </div>
              ))}
            </div>
          )}

          <div className="chart__foot">
            <span><strong>{fmt(visitors)}</strong> people stopped by</span>
            <span>Peak · {peakName}</span>
          </div>
        </article>

        <article className="card">
          <div className="card__head">
            <div>
              <h2 className="card__title">Projects getting noticed</h2>
              <p className="card__sub">Your most-saved work</p>
            </div>
            <ChartNoAxesColumn size={18} className="card__icon" aria-hidden="true" />
          </div>
          {noticed.length === 0 && <p className="empty">{loading ? 'Loading…' : 'Post a project to see it here.'}</p>}
          <ul className="noticed">
            {noticed.map((p) => (
              <li key={p.id} className="noticed__item">
                <span className={`avatar avatar--square avatar--${toneFor(p.title)}`}>{initialsOf(p.title)}</span>
                <div className="noticed__main">
                  <strong>{p.title}</strong>
                  <small>{p.stack}</small>
                </div>
                <span className="noticed__stat"><Eye size={13} aria-hidden="true" /> {fmt(p.views)}</span>
                <span className="noticed__stat"><Bookmark size={13} aria-hidden="true" /> {fmt(p.saves)}</span>
              </li>
            ))}
          </ul>
          <Link to="/trending" className="card__link">View all projects <ArrowUpRight size={14} aria-hidden="true" /></Link>
        </article>
      </div>

      <div className="row row--bottom">
        <article className="card">
          <h2 className="card__title">Recent activity</h2>
          <p className="card__sub">A little momentum, lately</p>
          {activity.length === 0 && <p className="empty">{loading ? 'Loading…' : 'Nothing yet. Share a project to get things moving.'}</p>}
          <ul className="activity">
            {activity.map((a) => {
              const Icon = icons[a.icon] || Eye
              return (
                <li key={a.id} className="activity__item">
                  <span className={`stat__icon tone--${a.tone}`}><Icon size={15} aria-hidden="true" /></span>
                  <div>
                    <p className="activity__text">
                      {Array.isArray(a.text)
                        ? a.text.map((part, i) => (typeof part === 'string' ? part : <strong key={i}>{part.b}</strong>))
                        : a.text}
                    </p>
                    <small>{a.time}</small>
                  </div>
                </li>
              )
            })}
          </ul>
        </article>

        <article className="cta">
          <span className="cta__icon"><Plus size={20} aria-hidden="true" /></span>
          <div className="cta__copy">
            <h2>Have a new idea brewing?</h2>
            <p>Put it out there and find the right people.</p>
          </div>
          <Link to="/" className="cta__btn">Share a project</Link>
        </article>
      </div>
    </section>
  )
}