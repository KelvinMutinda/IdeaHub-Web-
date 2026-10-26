import { api } from '../api'
import { shapePost, listOf } from './shape'

const TONES = ['sand', 'sage', 'rose']
const toneFor = (s = '') => TONES[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % TONES.length]
const num = (v) => (Array.isArray(v) ? v.length : Number(v) || 0)

/* A post from the database, shaped for the Trending / Top rated pages */
export function shapeProject(raw = {}) {
  const p = shapePost(raw)
  return {
    ...p,
    author: { ...p.author, tone: toneFor(p.author.name) },
    category: raw.category || 'Other',
    rating: Number(raw.rating ?? raw.avgRating ?? raw.averageRating) || 0,
    reviews: num(raw.reviews ?? raw.reviewsCount ?? raw.ratingCount),
    lift: Number(raw.lift ?? raw.trendScore) || 0,
  }
}

/* Tries the dedicated endpoint first (e.g. /posts/top-rated).
   If the backend doesn't have it yet (404), falls back to the plain /posts list. */
export async function loadProjects(path) {
  let data
  try {
    data = await api(path, { auth: true })
  } catch (err) {
    if (err.status !== 404) throw err
    data = await api('/posts', { auth: true })
  }
  return listOf(data, 'posts').map(shapeProject)
}

/* Category chips come from the data itself */
export const categoriesOf = (projects) => ['All projects', ...new Set(projects.map((p) => p.category))]