import { useState, useRef, useEffect } from 'react'
import { Search, SquarePen, Phone, Info, MoreHorizontal, Paperclip, Smile, SendHorizontal, ArrowLeft, CheckCheck } from 'lucide-react'


/* ---------- SAMPLE DATA: replace with your backend data later ---------- */
const CONVERSATIONS = [
  { id: 1, name: 'Maya Chen', initials: 'MC', online: true, last: 'Love the constellation idea!', time: '8m', unread: 2, project: 'Orbit Notes' },
  { id: 2, name: 'Inez Okafor', initials: 'IO', online: false, last: 'Want to compare webhook flows?', time: '42m', unread: 1, project: 'Patchwork API' },
  { id: 3, name: 'Jules Rivera', initials: 'JR', online: true, last: 'Thanks for the follow', time: '2h', unread: 0 },
  { id: 4, name: 'Theo Martin', initials: 'TM', online: false, last: 'Small Hours hit 100 saves', time: 'Yesterday', unread: 0, project: 'Small Hours' },
]
const MESSAGES = {
  1: [
    { id: 1, mine: false, text: 'Hey Alex, I just opened Orbit Notes. The little details feel so thoughtful.', time: '10:02' },
    { id: 2, mine: true, text: 'Thank you! I spent weeks on the connections view.', time: '10:04', seen: true },
    { id: 3, mine: false, text: 'Love the constellation idea! Could we collaborate on a mobile version?', time: '10:06' },
  ],
}

const TONES = ['green', 'peach', 'lilac', 'sand']

export default function Messenger() {
  const [activeId, setActiveId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [threads, setThreads] = useState(MESSAGES)
  const endRef = useRef(null)

  const active = CONVERSATIONS.find((c) => c.id === activeId)
  const messages = threads[activeId] ?? []
  const unreadTotal = CONVERSATIONS.reduce((n, c) => n + c.unread, 0)

  const list = CONVERSATIONS.filter((c) => {
    if (filter === 'unread' && !c.unread) return false
    if (filter === 'projects' && !c.project) return false
    const q = query.trim().toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || (c.project || '').toLowerCase().includes(q)
  })

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, activeId])

  const send = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !activeId) return
    const next = { id: Date.now(), mine: true, text, time: 'now' }
    setThreads({ ...threads, [activeId]: [...messages, next] })   // TODO: POST to your API
    setDraft('')
  }

  return (
    <div className={`messenger${activeId ? ' has-thread' : ''}`}>
      {/* ---------- LEFT: conversations ---------- */}
      <aside className="m-list">
        <header className="m-list-head">
          <h2>Messages</h2>
          <button className="m-icon" aria-label="New message"><SquarePen size={16} /></button>
        </header>

        <label className="m-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people or projects" />
        </label>

        <div className="m-tabs">
          {[['all', 'All'], ['unread', `Unread${unreadTotal ? ' ' + unreadTotal : ''}`], ['projects', 'Projects']].map(([key, label]) => (
            <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>

        <ul className="m-convos">
          {list.length === 0 && <li className="m-none">No conversations found.</li>}
          {list.map((c, i) => (
            <li key={c.id}>
              <button className={`m-convo${c.id === activeId ? ' active' : ''}`} onClick={() => setActiveId(c.id)}>
                <span className={`m-avatar tone-${TONES[i % 4]}`}>
                  {c.initials}
                  {c.online && <i className="m-online" />}
                </span>
                <span className="m-convo-body">
                  <span className="m-row"><strong>{c.name}</strong><small>{c.time}</small></span>
                  <span className="m-row">
                    <span className={`m-last${c.unread ? ' bold' : ''}`}>{c.last}</span>
                    {c.unread > 0 && <span className="m-badge">{c.unread}</span>}
                  </span>
                  {c.project && <span className="m-tag">{c.project}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ---------- RIGHT: thread ---------- */}
      <section className="m-thread">
        {!active ? (
          <div className="m-empty">
            <span className="m-empty-icon"><SquarePen size={26} /></span>
            <h3>Pick a conversation</h3>
            <p>Good ideas move faster when makers talk. Choose someone on the left.</p>
          </div>
        ) : (
          <>
            <header className="m-head">
              <button className="m-back" onClick={() => setActiveId(null)} aria-label="Back"><ArrowLeft size={18} /></button>
              <span className="m-avatar tone-peach">{active.initials}</span>
              <div className="m-who">
                <strong>{active.name}</strong>
                <small>{active.online ? 'Active now' : 'Offline'}</small>
              </div>
              <div className="m-actions">
                <button className="m-icon" aria-label="Call"><Phone size={16} /></button>
                <button className="m-icon" aria-label="Details"><Info size={16} /></button>
                <button className="m-icon" aria-label="More"><MoreHorizontal size={16} /></button>
              </div>
            </header>

            <div className="m-scroll">
              <ul className="m-messages">
                {messages.map((m) => (
                  <li key={m.id} className={`m-msg ${m.mine ? 'mine' : 'theirs'}`}>
                    <p className="m-bubble">{m.text}</p>
                    <span className="m-meta">{m.time}{m.mine && m.seen && <CheckCheck size={12} />}</span>
                  </li>
                ))}
              </ul>
              <div ref={endRef} />
            </div>

            <form className="m-composer" onSubmit={send}>
              <button type="button" className="m-icon" aria-label="Attach"><Paperclip size={16} /></button>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write something kind, clear, or curious..." />
              <button type="button" className="m-icon" aria-label="Emoji"><Smile size={16} /></button>
              <button type="submit" className="m-send" disabled={!draft.trim()} aria-label="Send"><SendHorizontal size={16} /></button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}