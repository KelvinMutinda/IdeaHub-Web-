/* Sample data — replace with your API calls. */

export const currentUser = { name: 'Alex Lee', firstName: 'Alex', initials: 'AL', role: 'Independent builder' }
export const unreadMessages = 3

export const projects = [
  {
    id: 'orbit-notes', title: 'Orbit Notes', category: 'Productivity',
    author: { name: 'Maya Chen', initials: 'MC', role: 'Product designer', tone: 'sage' },
    description: 'A softer kind of second brain. Collect ideas as constellations, then follow the threads that matter.',
    tags: ['Next.js', 'Supabase'], lift: 87, likes: 128, comments: 11, rating: 4.9, reviews: 214,
    art: { variant: 'orbit', label: 'Think in connections', bg: '#dbe8cc' },
  },
  {
    id: 'field-notes-ai', title: 'Field Notes AI', category: 'AI tools',
    author: { name: 'Jules Rivera', initials: 'JR', role: 'Data tinkerer', tone: 'peach' },
    description: "A field guide for the questions you haven't thought to ask your own data yet.",
    tags: ['Svelte', 'OpenAI'], lift: 72, likes: 96, comments: 18, rating: 4.8, reviews: 167,
    art: { variant: 'hill', label: 'Out there, in here', bg: '#f4d7c4' },
  },
  {
    id: 'small-hours', title: 'Small Hours', category: 'Lifestyle',
    author: { name: 'Theo Martin', initials: 'TM', role: 'iOS developer', tone: 'lavender' },
    description: 'Find the good light in your day with a forecast built for the moments between plans.',
    tags: ['SwiftUI', 'WeatherKit'], lift: 63, likes: 74, comments: 25, rating: 4.7, reviews: 132,
    art: { variant: 'sun', label: 'A little more light', bg: '#e5e3f3' },
  },
  {
    id: 'patchwork-api', title: 'Patchwork API', category: 'Developer tools',
    author: { name: 'Inez Okafor', initials: 'IO', role: 'Backend engineer', tone: 'sand' },
    description: 'A visual inbox for replaying webhooks and making the mysterious feel manageable.',
    tags: ['TypeScript', 'Hono'], lift: 48, likes: 59, comments: 32, rating: 4.6, reviews: 98,
    art: { variant: 'inbox', label: 'Event inbox', bg: '#f0e6c1' },
  },
]

export const categories = ['All projects', 'AI tools', 'Productivity', 'Developer tools', 'Lifestyle']

export const initialNotifications = [
  { id: 1, type: 'like', unread: true, title: 'Maya Chen loved your project', meta: 'Orbit Notes · “The little details feel so thoughtful.”', link: true, time: '8 min ago' },
  { id: 2, type: 'note', unread: true, title: 'Inez left you a note', meta: 'Patchwork API · “Want to compare webhook flows?”', link: true, time: '42 min ago' },
  { id: 3, type: 'follow', unread: true, title: 'Jules Rivera started following you', meta: 'Building with AI · Brooklyn', link: false, time: '2 hours ago' },
  { id: 4, type: 'milestone', unread: false, title: 'Small Hours reached 100 saves', meta: "A milestone for Theo Martin's project.", link: true, time: 'Yesterday' },
  { id: 5, type: 'save', unread: false, title: 'Samira Khan saved your project', meta: 'A new maker added your work to their collection.', link: false, time: 'Yesterday' },
  { id: 6, type: 'mention', unread: false, title: 'You were mentioned in a conversation', meta: 'Makers’ corner · “Alex might have a good point of view.”', link: false, time: 'Monday' },
]

export const dashboardStats = [
  { id: 'views', label: 'Project views', value: '2,481', delta: '+18.4%', icon: 'eye', tone: 'sage' },
  { id: 'saves', label: 'Saves', value: '186', delta: '+12.7%', icon: 'bookmark', tone: 'rose' },
  { id: 'connections', label: 'New connections', value: '24', delta: '+6 this week', icon: 'users', tone: 'lavender' },
  { id: 'appreciations', label: 'Appreciations', value: '312', delta: '+9.2%', icon: 'heart', tone: 'sand' },
]

export const weekly = [
  { day: 'Mon', views: 48, saves: 22 }, { day: 'Tue', views: 74, saves: 36 },
  { day: 'Wed', views: 56, saves: 28 }, { day: 'Thu', views: 94, saves: 50 },
  { day: 'Fri', views: 68, saves: 40 }, { day: 'Sat', views: 108, saves: 64 },
  { day: 'Sun', views: 82, saves: 44 },
]

export const noticed = [
  { id: 'orbit-notes', initials: 'MC', tone: 'sage', title: 'Orbit Notes', stack: 'Next.js · Supabase', views: '1,284', saves: 82 },
  { id: 'field-notes-ai', initials: 'JR', tone: 'peach', title: 'Field Notes AI', stack: 'Svelte · OpenAI', views: '786', saves: 57 },
  { id: 'patchwork-api', initials: 'IO', tone: 'lavender', title: 'Patchwork API', stack: 'TypeScript · Hono', views: '411', saves: 29 },
]

export const recentActivity = [
  { id: 1, icon: 'bookmark', tone: 'sand', text: [{ b: 'Maya Chen' }, ' saved Orbit Notes'], time: '12 minutes ago' },
  { id: 2, icon: 'users', tone: 'sage', text: [{ b: 'Samira Khan' }, ' followed your work'], time: '1 hour ago' },
  { id: 3, icon: 'heart', tone: 'rose', text: ['Your project received ', { b: '8 appreciations' }], time: 'Yesterday' },
]