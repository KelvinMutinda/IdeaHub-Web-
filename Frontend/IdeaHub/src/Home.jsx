import { useEffect, useMemo, useState } from 'react'
import { Sparkles, ArrowDownWideNarrow, Heart, MessageCircle, Bookmark, ArrowUpRight, Plus, Send } from 'lucide-react'
import { api } from './api'
import { shapePost, shapeUser, listOf } from './lib/shape'

const TONES = ['sand', 'sage', 'rose']

const tabs = [
  { id: 'all', label: 'All projects', match: () => true },
  { id: 'cofounder', label: 'Looking for a co-founder', match: (p) => p.cofounder },
  { id: 'open', label: 'Open source', match: (p) => p.openSource },
]

const emptyForm = { title: '', description: '', tech: '', price: '', demo: '', code: '', link: '' }
const WAVE = [30, 55, 40, 70, 35, 80, 50, 65, 30, 75, 45, 60, 38, 72, 48, 66, 32, 58, 42, 68, 36, 54, 46, 62, 34]

/* ------------------------------------------------------------------
   Cover art for each feed card (drawn with CSS, see home.css)
------------------------------------------------------------------- */
function FeedArt({ art }) {
  if (art.variant === 'orbit') {
    return (
      <div className="fart fart--orbit" aria-hidden="true">
        <span className="fart__label">{art.label}</span>
        <span className="fart__ring fart__ring--a" />
        <span className="fart__ring fart__ring--b" />
        <span className="fart__orb" />
        <span className="fart__dot fart__dot--a" />
        <span className="fart__dot fart__dot--b" />
        <span className="fart__caption">{art.caption}</span>
      </div>
    )
  }
  if (art.variant === 'hill') {
    return (
      <div className="fart fart--hill" aria-hidden="true">
        <span className="fart__big">{art.label}</span>
        <span className="fart__sun" />
        <span className="fart__mound fart__mound--back" />
        <span className="fart__mound" />
        <span className="fart__leaf fart__leaf--a" />
        <span className="fart__leaf fart__leaf--b" />
      </div>
    )
  }
  return (
    <div className="fart fart--inbox" aria-hidden="true">
      <div className="fart__top"><span>Event inbox</span><span className="fart__live">Live</span></div>
      <div className="fart__panel">
        <div className="fart__req"><span>POST /checkout</span><b>200</b></div>
        <div className="fart__wave">
          {WAVE.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}
        </div>
        <div className="fart__lat"><span>Delivery latency</span><b>84 ms</b></div>
      </div>
      <span className="fart__blob" />
    </div>
  )
}

export default function Home() {
  const [feed, setFeed] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState('all')
  const [saved, setSaved] = useState(() => new Set())
  const [following, setFollowing] = useState(() => new Set())
  const [form, setForm] = useState(emptyForm)
  const [notice, setNotice] = useState('')
  const [posting, setPosting] = useState(false)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  /* ---------- load posts + people from the database ---------- */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [postsData, peopleData] = await Promise.all([
          api('/posts', { auth: true }),
          api('/users?limit=3', { auth: true }).catch(() => []),   // people list is optional
        ])
        if (cancelled) return
        setFeed(listOf(postsData, 'posts').map(shapePost))
        setPeople(listOf(peopleData, 'users').map(shapeUser))
      } catch (err) {
        if (!cancelled) setLoadError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(() => feed.filter(tabs.find((t) => t.id === tab).match), [feed, tab])

  const toggleSet = (setter, id) =>
    setter((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  /* Like: update the screen right away, tell the server, undo if it fails */
  const flipLike = (id) =>
    setFeed((list) =>
      list.map((p) => (p.id === id ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) } : p))
    )

  const onLike = async (id) => {
    flipLike(id)
    try {
      await api(`/posts/${id}/like`, { method: 'POST', auth: true })
    } catch {
      flipLike(id)
    }
  }

  const onFollow = async (id) => {
    toggleSet(setFollowing, id)
    try {
      await api(`/users/${id}/follow`, { method: 'POST', auth: true })
    } catch {
      toggleSet(setFollowing, id)
    }
  }

  const onField = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || posting) return

    setPosting(true)
    try {
      const created = await api('/posts', {
        method: 'POST',
        auth: true,
        body: {
          title: form.title.trim(),
          description: form.description.trim(),
          tech: form.tech.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 4),
          price: form.price.trim(),
          demo: form.demo.trim(),
          code: form.code.trim(),
          link: form.link.trim(),
        },
      })
      const post = shapePost(created?.post || created)
      setFeed((list) => [post, ...list])
      setForm(emptyForm)
      setTab('all')
      setNotice('Your project is live in the feed.')
    } catch (err) {
      setNotice(err.message)
    } finally {
      setPosting(false)
      setTimeout(() => setNotice(''), 4000)
    }
  }

  return (
    <div className="home">
      {/* ───────────── feed column ───────────── */}
      <section className="home__main">
        <p className="home__date"><Sparkles size={14} aria-hidden="true" /> {today} <span aria-hidden="true">·</span> A good day to make</p>
        <h1 className="home__title">A little inspiration,<br />a lot of possibility.</h1>
        <p className="home__sub">See what people are making. Find your people. Put your idea out there.</p>

        <div className="home__toolbar">
          <div className="chips" role="group" aria-label="Filter projects">
            {tabs.map((t) => (
              <button
                key={t.id} type="button"
                className={'chip' + (t.id === tab ? ' is-active' : '')}
                aria-pressed={t.id === tab}
                onClick={() => setTab(t.id)}
              >{t.label}</button>
            ))}
          </div>
          <span className="home__curated"><ArrowDownWideNarrow size={13} aria-hidden="true" /> Curated for you</span>
        </div>

        <div className="home__section">
          <h2>Projects worth a closer look</h2>
          <span className="home__count"><i aria-hidden="true" /> {visible.length} {visible.length === 1 ? 'project' : 'projects'}</span>
        </div>

        <div className="feed">
          {loading && <p className="empty">Loading projects…</p>}
          {loadError && <p className="empty" role="alert">{loadError}</p>}

          {visible.map((p) => (
            <article key={p.id} className="fcard">
              <FeedArt art={p.art} />
              <div className="fcard__body">
                <header className="fcard__author">
                  <span className="avatar avatar--sage">{p.author.initials}</span>
                  <div>
                    <strong>{p.author.name}</strong>
                    <small>{p.author.role}</small>
                  </div>
                  <time>{p.time}</time>
                </header>

                <h3 className="fcard__title">{p.title}</h3>
                <p className="fcard__desc">{p.description}</p>
                <ul className="tags">
                  {p.tags.map((t) => <li key={t} className="tag">{t}</li>)}
                </ul>

                <footer className="fcard__foot">
                  <div className="fcard__actions">
                    <button
                      type="button"
                      className={'act' + (p.likedByMe ? ' is-on' : '')}
                      aria-pressed={p.likedByMe}
                      aria-label={`Like ${p.title}`}
                      onClick={() => onLike(p.id)}
                    >
                      <Heart size={16} aria-hidden="true" fill={p.likedByMe ? 'currentColor' : 'none'} />
                      {p.likes}
                    </button>
                    <span className="act act--static"><MessageCircle size={16} aria-hidden="true" /> {p.comments}</span>
                    <button
                      type="button"
                      className={'act' + (saved.has(p.id) ? ' is-on' : '')}
                      aria-pressed={saved.has(p.id)}
                      aria-label={`Save ${p.title}`}
                      onClick={() => toggleSet(setSaved, p.id)}
                    >
                      <Bookmark size={16} aria-hidden="true" fill={saved.has(p.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <button type="button" className="fcard__meet">
                    Meet the project <ArrowUpRight size={14} aria-hidden="true" />
                  </button>
                </footer>
              </div>
            </article>
          ))}
          {!loading && !loadError && visible.length === 0 && <p className="empty">Nothing here yet. Try another filter.</p>}
        </div>
      </section>

      {/* ───────────── right column ───────────── */}
      <aside className="home__aside">
        <section className="post">
          <div className="post__head">
            <div>
              <p className="post__eyebrow">Put it out there</p>
              <h2 className="post__title">Post a project</h2>
              <p className="post__sub">Your first version, the side project, the big idea. It all belongs here.</p>
            </div>
            <span className="post__plus" aria-hidden="true"><Plus size={18} /></span>
          </div>

          <form onSubmit={onSubmit} className="post__form">
            <div className="field">
              <label htmlFor="p-title">Title</label>
              <input id="p-title" name="title" value={form.title} onChange={onField} placeholder="eg. A Smart School Web Portal" required />
            </div>
            <div className="field">
              <label htmlFor="p-desc">Project description</label>
              <textarea id="p-desc" name="description" value={form.description} onChange={onField} placeholder="eg .A smart School Management System" />
            </div>
            <div className="field">
              <label htmlFor="p-tech">Tech stack</label>
              <input id="p-tech" name="tech" value={form.tech} onChange={onField} placeholder="React, Figma, …" />
              <small>Separate items with commas</small>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="p-price">Price</label>
                <input id="p-price" name="price" value={form.price} onChange={onField} placeholder="Free" />
              </div>
              <div className="field">
                <label htmlFor="p-demo">Live demo</label>
                <input id="p-demo" name="demo" value={form.demo} onChange={onField} placeholder="https://" />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="p-code">Code</label>
                <input id="p-code" name="code" value={form.code} onChange={onField} placeholder="Repository URL" />
              </div>
              <div className="field">
                <label htmlFor="p-link">Link</label>
                <input id="p-link" name="link" value={form.link} onChange={onField} placeholder="Live Link" />
              </div>
            </div>

            <button type="submit" className="post__btn" disabled={posting}>
              <Send size={16} aria-hidden="true" /> {posting ? 'Sharing…' : 'Share your project'}
            </button>
            {notice && <p className="post__notice" role="status">{notice}</p>}
          </form>
        </section>

        <section className="people">
          <div className="people__head">
            <h2>People to know</h2>
            <a href="#meet-more">Meet more</a>
          </div>
          <ul>
            {people.map((p, i) => (
              <li key={p.id} className="person">
                <span className={`avatar avatar--${TONES[i % TONES.length]}`}>{p.initials}</span>
                <div className="person__text">
                  <strong>{p.name}</strong>
                  <small>{p.role}</small>
                </div>
                <button
                  type="button"
                  className={'btn btn--outline' + (following.has(p.id) ? ' is-saved' : '')}
                  aria-pressed={following.has(p.id)}
                  onClick={() => onFollow(p.id)}
                >{following.has(p.id) ? 'Following' : 'Follow'}</button>
              </li>
            ))}
          </ul>
          <div className="people__note">
            <strong>Make a little room for the unexpected.</strong>
            <p>The best collaborations usually start with a hello.</p>
          </div>
        </section>
      </aside>
    </div>
  )
}