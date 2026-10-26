import { useEffect, useMemo, useState } from 'react'
import { Star, Bookmark } from 'lucide-react'
import ProjectArt from './components/ProjectArt'
import { loadProjects, categoriesOf } from './lib/projects'

export default function TopRated() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('All projects')
  const [saved, setSaved] = useState(() => new Set())

  useEffect(() => {
    let cancelled = false
    loadProjects('/posts/top-rated')
      .then((list) => { if (!cancelled) setProjects(list) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const categories = useMemo(() => categoriesOf(projects), [projects])

  const ranked = useMemo(() => {
    const list = category === 'All projects' ? projects : projects.filter((p) => p.category === category)
    return [...list].sort((a, b) => b.rating - a.rating || b.likes - a.likes)
  }, [projects, category])

  const toggleSave = (id) =>
    setSaved((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <section className="page">
      <div className="page__head">
        <div>
          <p className="eyebrow">Loved by the people who use it</p>
          <h1 className="page__title">Top rated</h1>
          <p className="page__sub">The projects makers keep coming back to.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button
              key={c} type="button"
              className={'chip' + (c === category ? ' is-active' : '')}
              aria-pressed={c === category}
              onClick={() => setCategory(c)}
            >{c}</button>
          ))}
        </div>
      </div>

      {loading && <p className="empty">Loading projects…</p>}
      {error && <p className="empty" role="alert">{error}</p>}

      <ol className="ranklist">
        {ranked.map((p, i) => (
          <li key={p.id} className="rank">
            <span className="rank__num" aria-label={`Rank ${i + 1}`}>{i + 1}</span>
            <div className="rank__art"><ProjectArt art={p.art} /></div>
            <div className="rank__main">
              <h2 className="rank__title">{p.title}</h2>
              <p className="rank__by">
                <span className={`avatar avatar--sm avatar--${p.author.tone}`}>{p.author.initials}</span>
                {p.author.name} · {p.category}
              </p>
              <ul className="tags">{p.tags.map((t) => <li key={t} className="tag">{t}</li>)}</ul>
            </div>
            <div className="rank__rating">
              <span className="rank__score"><Star size={16} fill="currentColor" aria-hidden="true" /> {p.rating.toFixed(1)}</span>
              <span className="rank__reviews">{p.reviews} reviews</span>
            </div>
            <button
              type="button"
              className={'btn btn--outline' + (saved.has(p.id) ? ' is-saved' : '')}
              aria-pressed={saved.has(p.id)}
              onClick={() => toggleSave(p.id)}
            >
              <Bookmark size={14} aria-hidden="true" fill={saved.has(p.id) ? 'currentColor' : 'none'} />
              {saved.has(p.id) ? 'Saved' : 'Save'}
            </button>
          </li>
        ))}
      </ol>
      {!loading && !error && ranked.length === 0 && <p className="empty">Nothing here yet. Try another category.</p>}
    </section>
  )
}