const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) throw new Error('JWT_SECRET is missing in your .env file')

const router = express.Router()

const User = require('../models/register')
const Project = require('../models/post')

/* ============================ HELPERS ============================ */
const str = (v) => (typeof v === 'string' ? v.trim() : '')
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const isUrl = (v) => {
  try { return ['http:', 'https:'].includes(new URL(v).protocol) } catch { return false }
}
const splitList = (v) => String(v || '').split(',').map((t) => t.trim()).filter(Boolean)
const initials = (first, last) => `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase()

const fail = (res, status, code, message, fields) =>
  res.status(status).json({ error: { code, message, ...(fields ? { fields } : {}) } })

const publicUser = (u) => ({
  id: u._id,
  name: `${u.firstName} ${u.lastName}`,
  initials: initials(u.firstName, u.lastName),
  role: u.occupation || 'Maker',
  email: u.email,
  profileUrl: u.profile,
})

/* the card shape the front end expects */
const mediaOf = (p) => {
  const images = Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [p.image] : [])
  return { images, image: images[0] || '', video: p.video || '' }
}

/* viewerId = the logged-in user (or undefined) so we can tell "did I like it?" */
const shapeProject = (p, owner, viewerId) => ({
  id: p._id,
  author: {
    name: `${owner.firstName} ${owner.lastName}`,
    initials: initials(owner.firstName, owner.lastName),
    role: owner.occupation || 'Maker',
  },
  title: p.title,
  description: p.description,
  tags: [...splitList(p.techstack), ...(p.price ? [p.price] : [])],
  demo: p.livedemo,
  code: p.code,
  link: p.link,
  ...mediaOf(p),
  likes: (p.likedBy || []).length,
  likedByMe: viewerId ? (p.likedBy || []).some((id) => String(id) === String(viewerId)) : false,
  comments: (p.comments || []).length,
  createdAt: p.createdAt,
})

const shapeComment = (c, author) => ({
  id: c._id,
  text: c.text,
  createdAt: c.createdAt,
  author: {
    name: author ? `${author.firstName} ${author.lastName}` : 'Former member',
    initials: author ? initials(author.firstName, author.lastName) : '?',
  },
})

const signToken = (user) => jwt.sign({ sub: String(user._id) }, JWT_SECRET, { expiresIn: '7d' })

const removeFiles = (files) => {
  Object.values(files || {}).flat().forEach((f) => fs.unlink(f.path, () => {}))
}

/* ============================ UPLOADS ============================ */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MB = 1024 * 1024
const MAX_IMAGE_BYTES = 5 * MB
const MAX_VIDEO_BYTES = 50 * MB
const MAX_PROJECT_IMAGES = 4

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
})

/* register: profile picture + resume */
const upload = multer({
  storage,
  limits: { fileSize: 5 * MB, files: 2 },
  fileFilter: (req, file, cb) => {
    const ok = file.fieldname === 'profile' ? IMAGE_TYPES : file.fieldname === 'resume' ? RESUME_TYPES : []
    cb(ok.includes(file.mimetype) ? null : new Error(`INVALID_FILE:${file.fieldname}`), ok.includes(file.mimetype))
  },
}).fields([{ name: 'profile', maxCount: 1 }, { name: 'resume', maxCount: 1 }])

const handleUpload = (req, res, next) =>
  upload(req, res, (err) => {
    if (!err) return next()
    removeFiles(req.files)
    if (err.code === 'LIMIT_FILE_SIZE') return fail(res, 400, 'FILE_TOO_LARGE', 'Each file must be 5 MB or smaller.')
    if (String(err.message).startsWith('INVALID_FILE')) {
      const field = err.message.split(':')[1]
      return fail(res, 400, 'INVALID_FILE', field === 'profile'
        ? 'Profile picture must be a JPG, PNG or WebP image.'
        : 'Resume must be a PDF or Word document.')
    }
    return fail(res, 400, 'UPLOAD_ERROR', 'Could not upload your files.')
  })

/* projects: up to 4 photos + 1 video */
const projectUpload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_BYTES, files: MAX_PROJECT_IMAGES + 1 },
  fileFilter: (req, file, cb) => {
    const ok = file.fieldname === 'images' ? IMAGE_TYPES : file.fieldname === 'video' ? VIDEO_TYPES : []
    cb(ok.includes(file.mimetype) ? null : new Error(`INVALID_FILE:${file.fieldname}`), ok.includes(file.mimetype))
  },
}).fields([{ name: 'images', maxCount: MAX_PROJECT_IMAGES }, { name: 'video', maxCount: 1 }])

const handleProjectUpload = (req, res, next) =>
  projectUpload(req, res, (err) => {
    if (!err) return next()
    removeFiles(req.files)
    if (err.code === 'LIMIT_FILE_SIZE') {
      return fail(res, 400, 'FILE_TOO_LARGE', 'Photos must be 5 MB or smaller and the video 50 MB or smaller.')
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
      return fail(res, 400, 'TOO_MANY_FILES', `You can upload up to ${MAX_PROJECT_IMAGES} photos and 1 video.`)
    }
    if (String(err.message).startsWith('INVALID_FILE')) {
      const field = err.message.split(':')[1]
      return fail(res, 400, 'INVALID_FILE', field === 'video'
        ? 'The demo video must be an MP4, WebM or MOV file.'
        : 'Photos must be JPG, PNG or WebP images.')
    }
    return fail(res, 400, 'UPLOAD_ERROR', 'Could not upload your files.')
  })

/* ============================ AUTH MIDDLEWARE ============================ */
const tokenOf = (req) => {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

/* must be logged in */
const requireAuth = async (req, res, next) => {
  const token = tokenOf(req)
  if (!token) return fail(res, 401, 'UNAUTHORIZED', 'Please log in to continue.')
  try {
    const { sub } = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(sub)
    if (!user) return fail(res, 401, 'UNAUTHORIZED', 'Please log in to continue.')
    req.user = user
    next()
  } catch {
    return fail(res, 401, 'UNAUTHORIZED', 'Your session has expired. Please log in again.')
  }
}

/* logged in OR not: used by the public feed so it can still show "liked by me" */
const optionalAuth = async (req, res, next) => {
  const token = tokenOf(req)
  if (token) {
    try {
      const { sub } = jwt.verify(token, JWT_SECRET)
      req.user = await User.findById(sub)
    } catch { /* bad or expired token: treat as a guest */ }
  }
  next()
}

/* ============================ POST /api/register ============================ */
router.post('/register', handleUpload, async (req, res, next) => {
  try {
    const b = req.body || {}
    const firstName = str(b.firstname)
    const lastName = str(b.lastname)
    const email = str(b.email).toLowerCase()
    const password = typeof b.password === 'string' ? b.password : ''

    const fields = {}
    if (!firstName) fields.firstname = 'First name is required.'
    if (!lastName) fields.lastname = 'Last name is required.'
    if (!isEmail(email)) fields.email = 'Enter a valid email address.'
    if (password.length < 8) fields.password = 'Password must be at least 8 characters.'
    if (password.length > 72) fields.password = 'Password must be 72 characters or fewer.'
    if (Object.keys(fields).length) {
      removeFiles(req.files)
      return fail(res, 400, 'VALIDATION_ERROR', 'Please fix the highlighted fields.', fields)
    }

    if (await User.exists({ email })) {
      removeFiles(req.files)
      return fail(res, 409, 'EMAIL_TAKEN', 'An account with this email already exists.', { email: 'Email already in use.' })
    }

    const skills = str(b.skills).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 15)
    const profile = req.files?.profile?.[0]
    const resume = req.files?.resume?.[0]

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: await bcrypt.hash(password, 12),
      phone: str(b.phone).slice(0, 30),
      occupation: str(b.occupation).slice(0, 80),
      skills: skills.join(', '),
      bio: str(b.bio).slice(0, 1000),
      profile: profile ? `/uploads/${profile.filename}` : '',
      resume: resume ? `/uploads/${resume.filename}` : '',
    })

    res.status(201).json({ data: { user: publicUser(user), token: signToken(user) } })
  } catch (err) {
    removeFiles(req.files)
    if (err.code === 11000) return fail(res, 409, 'EMAIL_TAKEN', 'An account with this email already exists.')
    next(err)
  }
})

/* ============================ POST /api/login ============================ */
router.post('/login', async (req, res, next) => {
  try {
    const email = str(req.body?.email).toLowerCase()
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const user = email && password ? await User.findOne({ email }) : null
    const ok = user && (await bcrypt.compare(password, user.password))
    if (!ok) return fail(res, 401, 'INVALID_CREDENTIALS', 'Incorrect email or password.')
    res.json({ data: { user: publicUser(user), token: signToken(user) } })
  } catch (err) { next(err) }
})

/* ============================ POST /api/projects ============================
   multipart/form-data: title, description, tech, price, demo, code, link,
   images (up to 4 files), video (1 file)                                       */
router.post('/projects', requireAuth, handleProjectUpload, async (req, res, next) => {
  try {
    const b = req.body || {}
    const title = str(b.title)
    const description = str(b.description)
    const price = str(b.price) || 'Free'
    const demo = str(b.demo)
    const code = str(b.code)
    const link = str(b.link)
    const tech = (Array.isArray(b.tech) ? b.tech : str(b.tech).split(','))
      .map((t) => String(t).trim()).filter(Boolean)

    const imageFiles = req.files?.images || []
    const videoFile = req.files?.video?.[0]

    const fields = {}
    if (title.length < 3 || title.length > 120) fields.title = 'Title must be 3 to 120 characters.'
    if (description.length > 2000) fields.description = 'Description must be 2000 characters or fewer.'
    if (tech.length > 10 || tech.some((t) => t.length > 30)) fields.tech = 'Use up to 10 items, each 30 characters or fewer.'
    if (price.length > 30) fields.price = 'Price must be 30 characters or fewer.'
    if (demo && !isUrl(demo)) fields.demo = 'Enter a valid link starting with http:// or https://'
    if (code && !isUrl(code)) fields.code = 'Enter a valid link starting with http:// or https://'
    if (link && !isUrl(link)) fields.link = 'Enter a valid link starting with http:// or https://'
    if (imageFiles.some((f) => f.size > MAX_IMAGE_BYTES)) fields.images = 'Each photo must be 5 MB or smaller.'
    if (Object.keys(fields).length) {
      removeFiles(req.files)           // don't leave rejected uploads on disk
      return fail(res, 400, 'VALIDATION_ERROR', 'Please fix the highlighted fields.', fields)
    }

    const project = await Project.create({
      owner: req.user._id, title, description, price,
      techstack: tech.join(', '),
      livedemo: demo, code, link,
      images: imageFiles.map((f) => `/uploads/${f.filename}`),
      video: videoFile ? `/uploads/${videoFile.filename}` : '',
    })
    res.status(201).json({ data: shapeProject(project, req.user, req.user._id) })
  } catch (err) {
    removeFiles(req.files)
    next(err)
  }
})

/* ============================ GET /api/projects ============================
   Public. Send the token too and each card knows whether YOU liked it.        */
router.get('/projects', optionalAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const [items, total] = await Promise.all([
      Project.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('owner'),
      Project.countDocuments(),
    ])
    res.json({
      data: items.filter((p) => p.owner).map((p) => shapeProject(p, p.owner, req.user?._id)),
      meta: { page, limit, total },
    })
  } catch (err) { next(err) }
})

/* ============================ LIKES ============================
   POST /api/projects/:id/like  → toggles your like. Returns { liked, likes }  */
router.post('/projects/:id/like', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'NOT_FOUND', 'Project not found.')
    const project = await Project.findById(req.params.id).select('likedBy')
    if (!project) return fail(res, 404, 'NOT_FOUND', 'Project not found.')

    const uid = req.user._id
    const already = project.likedBy.some((id) => id.equals(uid))
    const updated = await Project.findByIdAndUpdate(
      project._id,
      already ? { $pull: { likedBy: uid } } : { $addToSet: { likedBy: uid } },
      { new: true }
    ).select('likedBy')

    res.json({ data: { liked: !already, likes: updated.likedBy.length } })
  } catch (err) { next(err) }
})

/* ============================ COMMENTS ============================
   GET  /api/projects/:id/comments → list (oldest first)
   POST /api/projects/:id/comments  { text } → adds one (login needed)         */
router.get('/projects/:id/comments', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'NOT_FOUND', 'Project not found.')
    const project = await Project.findById(req.params.id).select('comments').populate('comments.author')
    if (!project) return fail(res, 404, 'NOT_FOUND', 'Project not found.')
    res.json({ data: project.comments.map((c) => shapeComment(c, c.author)) })
  } catch (err) { next(err) }
})

router.post('/projects/:id/comments', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, 'NOT_FOUND', 'Project not found.')
    const text = str(req.body?.text)
    if (!text) return fail(res, 400, 'VALIDATION_ERROR', 'Write something first.', { text: 'Comment cannot be empty.' })
    if (text.length > 500) return fail(res, 400, 'VALIDATION_ERROR', 'Comments are limited to 500 characters.', { text: 'Too long.' })

    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { author: req.user._id, text } } },
      { new: true }
    ).select('comments')
    if (!updated) return fail(res, 404, 'NOT_FOUND', 'Project not found.')

    const created = updated.comments[updated.comments.length - 1]
    res.status(201).json({ data: { comment: shapeComment(created, req.user), total: updated.comments.length } })
  } catch (err) { next(err) }
})

/* ============================ GET /api/users ============================
   "People to know": a few other members (never yourself, never emails)        */
router.get('/users', optionalAuth, async (req, res, next) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5))
    const filter = req.user ? { _id: { $ne: req.user._id } } : {}
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(limit)
    res.json({
      data: users.map((u) => ({
        id: u._id,
        name: `${u.firstName} ${u.lastName}`,
        initials: initials(u.firstName, u.lastName),
        role: u.occupation || 'Maker',
        profileUrl: u.profile,
      })),
    })
  } catch (err) { next(err) }
})

/* ============================ ERRORS ============================ */
router.use((err, req, res, next) => {
  console.error(err)
  fail(res, 500, 'SERVER_ERROR', 'Something went wrong on our side.')
})

module.exports = router
