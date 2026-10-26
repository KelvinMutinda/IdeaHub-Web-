const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

/* Uploaded files (profile picture, resume) are served by the backend. */
export const fileUrl = (p) => {
  if (!p) return ''
  if (/^https?:/i.test(p)) return p
  return `${API_ORIGIN}/${String(p).replace(/^\/+/, '')}`
}

export function timeAgo(date) {
  if (!date) return ''
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 172800) return 'Yesterday'
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const toList = (v) =>
  Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []

const count = (v) => (Array.isArray(v) ? v.length : Number(v) || 0)

export function shapeUser(raw = {}) {
  const name =
    raw.name ||
    [raw.firstname, raw.lastname].filter(Boolean).join(' ').trim() ||
    raw.email?.split('@')[0] ||
    'Someone'
  const initials = raw.initials || name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  return {
    ...raw,
    id: raw.id ?? raw._id,
    name,
    initials,
    role: raw.occupation || raw.role || 'Maker',
    bio: raw.bio || '',
    skills: toList(raw.skills),
    avatar: fileUrl(raw.profile || raw.avatar || raw.profilePicture),
    resume: fileUrl(raw.resume),
  }
}

const VARIANTS = ['orbit', 'hill', 'inbox']

export function shapePost(raw = {}) {
  const title = raw.title || 'Untitled'
  const tags = toList(raw.tech ?? raw.techStack ?? raw.tags)
  if (raw.price && String(raw.price).trim()) tags.push(String(raw.price).trim())
  return {
    id: raw.id ?? raw._id,
    author: shapeUser(raw.author || raw.user || {}),
    time: timeAgo(raw.createdAt || raw.created_at),
    title,
    description: raw.description || 'No description yet.',
    tags,
    likes: count(raw.likes ?? raw.likesCount),
    comments: count(raw.comments ?? raw.commentsCount),
    likedByMe: !!raw.likedByMe,
    art: { variant: VARIANTS[title.length % 3], label: title, caption: 'Freshly shared' },
    cofounder: !!raw.cofounder,
    openSource: !!raw.openSource,
  }
}

/* The API may send an array or { posts: [...] } / { users: [...] } */
export const listOf = (data, key) => (Array.isArray(data) ? data : data?.[key] || [])