import { useEffect, useMemo, useRef, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import {
  Sparkles, ArrowDownWideNarrow, Heart, MessageCircle, Bookmark, ArrowUpRight,
  Plus, Send, ImagePlus, Video, X, Play,
} from 'lucide-react'
import { api, assetUrl, getToken } from './api'


const TONES = ['sand', 'sage', 'rose']

/* filters: each one decides which projects to keep */
const tabs = [
  { id: 'all', label: 'All projects', match: () => true },
  { id: 'open', label: 'Open source', match: (p) => !!p.code },
  { id: 'video', label: 'With video', match: (p) => !!p.video },
]

const emptyForm = { title: '', description: '', tech: '', price: '', demo: '', code: '', link: '' }

/* upload limits (the server enforces the same ones) */
const MB = 1024 * 1024
const MAX_PHOTOS = 4
const MAX_PHOTO_MB = 5
const MAX_VIDEO_MB = 50
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

/* ---------- small helpers ---------- */
function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d} d ago` : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* the server's project → exactly what the cards use (fills any gaps with safe defaults) */
const toCard = (p) => ({
  id: p.id,
  author: p.author || { name: 'Unknown', initials: '?', role: 'Maker' },
  title: p.title || '',
  description: p.description || '',
  tags: p.tags || [],
  demo: p.demo || '',
  code: p.code || '',
  link: p.link || '',
  images: p.images || [],
  video: p.video || '',
  likes: p.likes || 0,
  likedByMe: !!p.likedByMe,
  comments: p.comments || 0,
  createdAt: p.createdAt,
})

/* ---------- photos + video on a feed card ---------- */
function Media({ post }) {
  const [i, setI] = useState(0)
  const slides = [
    ...(post.video ? [{ type: 'video', src: assetUrl(post.video) }] : []),
    ...post.images.map((src) => ({ type: 'image', src: assetUrl(src) })),
  ]

  /* nothing uploaded: show a soft placeholder with the project's first letter */
  if (!slides.length) {
    return (
      <div className="media media--empty" aria-hidden="true">
        <Sparkles size={26} />
        <span>{post.title.slice(0, 1).toUpperCase()}</span>
      </div>
    )
  }

  const cur = slides[Math.min(i, slides.length - 1)]
  return (
    <div className="media">
      <div className="media__main">
        {cur.type === 'video' ? (
          <video key={cur.src} src={cur.src} controls playsInline preload="metadata" />
        ) : (
          <img key={cur.src} src={cur.src} alt={`${post.title}, photo`} loading="lazy" />
        )}
      </div>

      {/* thumbnails appear only when there is more than one item */}
      {slides.length > 1 && (
        <div className="media__thumbs">
          {slides.map((s, n) => (
            <button
              key={s.src} type="button"
              className={'media__thumb' + (n === i ? ' is-active' : '')}
              onClick={() => setI(n)}
              aria-label={s.type === 'video' ? 'Show video' : `Show photo ${n}`}
            >
              {s.type === 'video' ? <span className="media__play"><Play size={14} /></span> : <img src={s.src} alt="" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- comments under a card (loaded when opened) ---------- */
function Comments({ postId, onCount }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let off = false
    api(`/projects/${postId}/comments`)
      .then((d) => { if (!off) setItems(d || []) })
      .catch((e) => { if (!off) setError(e.message) })
      .finally(() => { if (!off) setLoading(false) })
    return () => { off = true }
  }, [postId])

  const send = async (e) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || sending) return
    if (!getToken()) return toast.error('Log in to comment.')
    setSending(true)
    setError('')
    try {
      const res = await api(`/projects/${postId}/comments`, { method: 'POST', auth: true, body: { text: t } })
      setItems((list) => [...list, res.comment])
      onCount(res.total)
      setText('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="cmt">
      {loading && <p className="cmt__note">Loading comments…</p>}
      {!loading && items.length === 0 && !error && <p className="cmt__note">No comments yet. Say something kind.</p>}
      {error && <p className="cmt__note cmt__note--err" role="alert">{error}</p>}

      <ul className="cmt__list">
        {items.map((c) => (
          <li key={c.id} className="cmt__item">
            <span className="avatar avatar--sand">{c.author.initials}</span>
            <div>
              <p><strong>{c.author.name}</strong> <small>{timeAgo(c.createdAt)}</small></p>
              <p className="cmt__text">{c.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <form className="cmt__form" onSubmit={send}>
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…" maxLength={500} aria-label="Write a comment"
        />
        <button type="submit" disabled={sending || !text.trim()} aria-label="Send comment"><Send size={15} /></button>
      </form>
    </div>
  )
}

/* ============================ PAGE ============================ */
export default function Home() {
  const [feed, setFeed] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState('all')
  const [saved, setSaved] = useState(() => new Set())
  const [following, setFollowing] = useState(() => new Set())
  const [openComments, setOpenComments] = useState(() => new Set())   // which cards show their comments

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [photos, setPhotos] = useState([])        // [{ file, url }]  url = local preview
  const [video, setVideo] = useState(null)        // { file, url } | null
  const [posting, setPosting] = useState(false)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  /* free the preview URLs when the page closes (browsers keep them in memory otherwise) */
  const live = useRef({ photos: [], video: null })
  live.current = { photos, video }
  useEffect(() => () => {
    live.current.photos.forEach((p) => URL.revokeObjectURL(p.url))
    if (live.current.video) URL.revokeObjectURL(live.current.video.url)
  }, [])

  /* load the feed and "people to know" once */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [postsData, peopleData] = await Promise.all([
          api('/projects', { auth: true }),
          api('/users?limit=3', { auth: true }).catch(() => []),
        ])
        if (cancelled) return
        setFeed((postsData || []).map(toCard))
        setPeople(peopleData || [])
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

  /* ---------- likes: change the heart instantly, then confirm with the server ---------- */
  const flipLike = (id) =>
    setFeed((list) =>
      list.map((p) => (p.id === id ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) } : p))
    )

  const onLike = async (id) => {
    if (!getToken()) return toast.error('Log in to like projects.')
    flipLike(id)
    try {
      const r = await api(`/projects/${id}/like`, { method: 'POST', auth: true })
      setFeed((list) => list.map((p) => (p.id === id ? { ...p, likedByMe: r.liked, likes: r.likes } : p)))
    } catch (err) {
      flipLike(id)                    // the server said no: put it back
      toast.error(err.message)
    }
  }

  const setCommentCount = (id, n) =>
    setFeed((list) => list.map((p) => (p.id === id ? { ...p, comments: n } : p)))

  /* follow is stored only on this device for now (the server has no follow endpoint yet) */
  const onFollow = (id) => toggleSet(setFollowing, id)

  /* ---------- the form ---------- */
  const onField = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
  }

  const onPhotos = (e) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''                          // lets you pick the same file again later
    const room = MAX_PHOTOS - photos.length
    const good = []
    for (const f of picked) {
      if (!PHOTO_TYPES.includes(f.type)) { toast.error(`${f.name}: use a JPG, PNG or WebP photo.`); continue }
      if (f.size > MAX_PHOTO_MB * MB) { toast.error(`${f.name} is over ${MAX_PHOTO_MB} MB.`); continue }
      good.push(f)
    }
    if (good.length > room) toast.error(`You can add up to ${MAX_PHOTOS} photos.`)
    setPhotos((list) => [...list, ...good.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }

  const removePhoto = (url) => {
    URL.revokeObjectURL(url)
    setPhotos((list) => list.filter((p) => p.url !== url))
  }

  const onVideo = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!VIDEO_TYPES.includes(f.type)) return toast.error('Use an MP4, WebM or MOV video.')
    if (f.size > MAX_VIDEO_MB * MB) return toast.error(`The video must be ${MAX_VIDEO_MB} MB or smaller.`)
    if (video) URL.revokeObjectURL(video.url)
    setVideo({ file: f, url: URL.createObjectURL(f) })
  }

  const removeVideo = () => {
    if (video) URL.revokeObjectURL(video.url)
    setVideo(null)
  }

  const resetForm = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url))
    if (video) URL.revokeObjectURL(video.url)
    setPhotos([]); setVideo(null); setForm(emptyForm); setErrors({})
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (posting) return
    if (!getToken()) return toast.error('Log in to post a project.')
    if (form.title.trim().length < 3) return setErrors({ title: 'Give your project a title (3+ characters).' })

    /* files can't travel as JSON, so everything goes as FormData */
    const body = new FormData()
    Object.entries(form).forEach(([k, v]) => body.append(k, v.trim()))
    photos.forEach((p) => body.append('images', p.file))
    if (video) body.append('video', video.file)

    setPosting(true)
    setErrors({})
    try {
      const created = await api('/projects', { method: 'POST', auth: true, body })
      setFeed((list) => [toCard(created), ...list])
      resetForm()
      setTab('all')
      toast.success('Your project is live in the feed.')
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      toast.error(err.message)
    } finally {
      setPosting(false)
    }
  }

  const fieldErr = (name) => (errors[name] ? <small className="field-error">{errors[name]}</small> : null)

  return (
    <div className="home">
      <Toaster position="top-right" />

      {/* ============ feed ============ */}
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
          <span className="home__curated"><ArrowDownWideNarrow size={13} aria-hidden="true" /> Newest first</span>
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
              <Media post={p} />
              <div className="fcard__body">
                <header className="fcard__author">
                  <span className="avatar avatar--sage">{p.author.initials}</span>
                  <div>
                    <strong>{p.author.name}</strong>
                    <small>{p.author.role}</small>
                  </div>
                  <time>{timeAgo(p.createdAt)}</time>
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

                    <button
                      type="button"
                      className={'act' + (openComments.has(p.id) ? ' is-on' : '')}
                      aria-expanded={openComments.has(p.id)}
                      aria-label={`Comments on ${p.title}`}
                      onClick={() => toggleSet(setOpenComments, p.id)}
                    >
                      <MessageCircle size={16} aria-hidden="true" /> {p.comments}
                    </button>

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

                  {(p.demo || p.link) ? (
                    <a className="fcard__meet" href={p.demo || p.link} target="_blank" rel="noreferrer">
                      Meet the project <ArrowUpRight size={14} aria-hidden="true" />
                    </a>
                  ) : null}
                </footer>

                {openComments.has(p.id) && <Comments postId={p.id} onCount={(n) => setCommentCount(p.id, n)} />}
              </div>
            </article>
          ))}
          {!loading && !loadError && visible.length === 0 && <p className="empty">Nothing here yet. Try another filter.</p>}
        </div>
      </section>

      {/* ============ side panel ============ */}
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

          <form onSubmit={onSubmit} className="post__form" noValidate>
            <div className="field">
              <label htmlFor="p-title">Title</label>
              <input id="p-title" name="title" value={form.title} onChange={onField} placeholder="eg. A Smart School Web Portal" className={errors.title ? 'input-invalid' : ''} />
              {fieldErr('title')}
            </div>
            <div className="field">
              <label htmlFor="p-desc">Project description</label>
              <textarea id="p-desc" name="description" value={form.description} onChange={onField} placeholder="What does it do, and who is it for?" />
              {fieldErr('description')}
            </div>
            <div className="field">
              <label htmlFor="p-tech">Tech stack</label>
              <input id="p-tech" name="tech" value={form.tech} onChange={onField} placeholder="React, Node, MongoDB" />
              <small>Separate items with commas</small>
              {fieldErr('tech')}
            </div>

            {/* ----- photos with preview ----- */}
            <div className="field">
              <label>Project photos <small>(up to {MAX_PHOTOS}, {MAX_PHOTO_MB} MB each)</small></label>
              <div className="upl__grid">
                {photos.map((p) => (
                  <div key={p.url} className="upl__item">
                    <img src={p.url} alt="Selected photo preview" />
                    <button type="button" className="upl__remove" onClick={() => removePhoto(p.url)} aria-label="Remove photo"><X size={14} /></button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="upl__add" htmlFor="p-photos">
                    <ImagePlus size={20} aria-hidden="true" />
                    <span>Add photo</span>
                    <input id="p-photos" type="file" accept={PHOTO_TYPES.join(',')} multiple onChange={onPhotos} hidden />
                  </label>
                )}
              </div>
              {fieldErr('images')}
            </div>

            {/* ----- demo video with preview ----- */}
            <div className="field">
              <label>Demo video <small>(MP4, WebM or MOV, up to {MAX_VIDEO_MB} MB)</small></label>
              {video ? (
                <div className="upl__video">
                  <video src={video.url} controls playsInline muted preload="metadata" />
                  <button type="button" className="upl__remove" onClick={removeVideo} aria-label="Remove video"><X size={14} /></button>
                </div>
              ) : (
                <label className="upl__add upl__add--wide" htmlFor="p-video">
                  <Video size={20} aria-hidden="true" />
                  <span>Add a demo video</span>
                  <input id="p-video" type="file" accept={VIDEO_TYPES.join(',')} onChange={onVideo} hidden />
                </label>
              )}
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="p-price">Price</label>
                <input id="p-price" name="price" value={form.price} onChange={onField} placeholder="Free" />
                {fieldErr('price')}
              </div>
              <div className="field">
                <label htmlFor="p-demo">Live demo link</label>
                <input id="p-demo" name="demo" value={form.demo} onChange={onField} placeholder="https://" />
                {fieldErr('demo')}
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="p-code">Code</label>
                <input id="p-code" name="code" value={form.code} onChange={onField} placeholder="Repository URL" />
                {fieldErr('code')}
              </div>
              <div className="field">
                <label htmlFor="p-link">Link</label>
                <input id="p-link" name="link" value={form.link} onChange={onField} placeholder="Website or app link" />
                {fieldErr('link')}
              </div>
            </div>

            <button type="submit" className="post__btn" disabled={posting}>
              <Send size={16} aria-hidden="true" /> {posting ? 'Uploading…' : 'Share your project'}
            </button>
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