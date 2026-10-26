import { useEffect, useMemo, useState } from 'react'
import { Flame, ArrowDownWideNarrow, ChevronDown } from 'lucide-react'
import ProjectCard from './components/ProjectCard'
import ProjectArt from './components/ProjectArt'
import { loadProjects, categoriesOf } from './lib/projects'

const sorters = {
  lift: { label: 'Picking up', fn: (a, b) => b.lift - a.lift },
  likes: { label: 'Most loved', fn: (a, b) => b.likes - a.likes },
  comments: { label: 'Most talked about', fn: (a, b) => b.comments - a.comments },
}

export default function Trending() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('All projects')
  const [sort, setSort] = useState('lift')
  const [saved, setSaved] = useState(() => new Set())

  useEffect(() => {
    let cancelled = false
    loadProjects('/posts/trending')
      .then((list) => { if (!cancelled) setProjects(list) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const categories = useMemo(() => categoriesOf(projects), [projects])

  // The hero shows the project that is picking up fastest
  const featured = useMemo(
    () => [...projects].sort(sorters.lift.fn)[0] || null,
    [projects]
  )

  const visible = useMemo(() => {
    const list = category === 'All projects' ? projects : projects.filter((p) => p.category === category)
    return [...list].sort(sorters[sort].fn)
  }, [projects, category, sort])

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
          <p className="eyebrow">A pulse on what's being made</p>
          <h1 className="page__title">Trending right now</h1>
          <p className="page__sub">Fresh ideas finding their first little crowd.</p>
        </div>
        <button type="button" className="link-btn"><Flame size={16} aria-hidden="true" /> How this works</button>
      </div>

      {featured && (
        <article className="hero">
          <div className="hero__copy">
            <p className="hero__kicker"><Flame size={13} aria-hidden="true" /> The one people keep passing around</p>
            <h2 className="hero__title">{featured.title}</h2>
            <p className="hero__text">{featured.description}</p>
            <div className="hero__author">
              <span className={`avatar avatar--sm avatar--${featured.author.tone}`}>{featured.author.initials}</span>
              <span>{featured.author.name}</span>
              <span className="hero__sep" aria-hidden="true">·</span>
              <span>{featured.author.role}</span>
            </div>
          </div>
          <div className="hero__art">
            {featured.lift > 0 && <span className="hero__chip">+{Math.round(featured.lift)}% this week</span>}
            <div className="hero__tile"><ProjectArt art={featured.art} /></div>
          </div>
        </article>
      )}

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
        <label className="select">
          <ArrowDownWideNarrow size={14} aria-hidden="true" />
          <span className="sr-only">Sort projects</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.entries(sorters).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
      </div>

      {loading && <p className="empty">Loading projects…</p>}
      {error && <p className="empty" role="alert">{error}</p>}

      <div className="grid">
        {visible.map((p) => (
          <ProjectCard key={p.id} project={p} saved={saved.has(p.id)} onToggleSave={toggleSave} />
        ))}
      </div>
      {!loading && !error && visible.length === 0 && <p className="empty">Nothing here yet. Try another category.</p>}
    </section>
  )
}