/* ------------------------------------------------------------------
   routes.js — IdeaHub API: register, login, post project, list projects
   Mounted in server.js as:  app.use('/api', require('./auth/routes'))
   Needs in .env:  JWT_SECRET=<long random string>
   ------------------------------------------------------------------ */
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

/* ============================ MODELS ============================
   Your own schema files (see models/register.js and models/post.js).
   This file lives in Backend/auth/, so the models are one folder up. */
const User = require('../models/register')
const Project = require('../models/post')

/* ============================ HELPERS ============================ */
const str = (v) => (typeof v === 'string' ? v.trim() : '')
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const isUrl = (v) => {
  try { return ['http:', 'https:'].includes(new URL(v).protocol) } catch { return false }
}
const splitList = (v) => String(v || '').split(',').map((t) => t.trim()).filter(Boolean)
const initials = (first, last) => `${first[0] || ''}${last[0] || ''}`.toUpperCase()

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

/* shaped like the cards in Home.jsx */
const shapeProject = (p, owner) => ({
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
  likes: 0,
  comments: 0,
  createdAt: p.createdAt,
})

const signToken = (user) => jwt.sign({ sub: String(user._id) }, JWT_SECRET, { expiresIn: '7d' })

const removeFiles = (files) => {
  Object.values(files || {}).flat().forEach((f) => fs.unlink(f.path, () => {}))
}

/* ============================ UPLOADS ============================ */
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads')   // Backend/uploads (same folder server.js serves)
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },        // 5 MB each
  fileFilter: (req, file, cb) => {
    const ok = file.fieldname === 'profile' ? IMAGE_TYPES : file.fieldname === 'resume' ? RESUME_TYPES : []
    cb(ok.includes(file.mimetype) ? null : new Error(`INVALID_FILE:${file.fieldname}`), ok.includes(file.mimetype))
  },
}).fields([{ name: 'profile', maxCount: 1 }, { name: 'resume', maxCount: 1 }])

/* runs multer and turns its errors into normal JSON errors */
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

/* ============================ AUTH MIDDLEWARE ============================ */
const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
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

/* ============================ POST /api/register ============================
   multipart/form-data: firstname, lastname, email, phone, occupation,
   skills (comma separated), bio, password, profile (image), resume (pdf/doc)  */
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
      password: await bcrypt.hash(password, 12),      // only the hash is stored
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

/* ============================ POST /api/login ============================
   JSON: { email, password }  → needed so users can post projects           */
router.post('/login', async (req, res, next) => {
  try {
    const email = str(req.body?.email).toLowerCase()
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const user = email && password ? await User.findOne({ email }) : null
    const ok = user && (await bcrypt.compare(password, user.password))
    if (!ok) return fail(res, 401, 'INVALID_CREDENTIALS', 'Incorrect email or password.')   // same message either way
    res.json({ data: { user: publicUser(user), token: signToken(user) } })
  } catch (err) { next(err) }
})

/* ============================ POST /api/projects ============================
   Header: Authorization: Bearer <token>
   JSON: { title, description, tech: "React, Figma", price, demo, code, link }  */
router.post('/projects', requireAuth, async (req, res, next) => {
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

    const fields = {}
    if (title.length < 3 || title.length > 120) fields.title = 'Title must be 3 to 120 characters.'
    if (description.length > 2000) fields.description = 'Description must be 2000 characters or fewer.'
    if (tech.length > 10 || tech.some((t) => t.length > 30)) fields.tech = 'Use up to 10 items, each 30 characters or fewer.'
    if (price.length > 30) fields.price = 'Price must be 30 characters or fewer.'
    if (demo && !isUrl(demo)) fields.demo = 'Enter a valid link starting with http:// or https://'
    if (code && !isUrl(code)) fields.code = 'Enter a valid link starting with http:// or https://'
    if (link && !isUrl(link)) fields.link = 'Enter a valid link starting with http:// or https://'
    if (Object.keys(fields).length) return fail(res, 400, 'VALIDATION_ERROR', 'Please fix the highlighted fields.', fields)

    const project = await Project.create({
      owner: req.user._id, title, description, price,
      techstack: tech.join(', '),
      livedemo: demo, code, link,
    })
    res.status(201).json({ data: shapeProject(project, req.user) })
  } catch (err) { next(err) }
})

/* ============================ GET /api/projects ============================
   Public feed, newest first. Query: ?page=1&limit=20                       */
router.get('/projects', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const [items, total] = await Promise.all([
      Project.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('owner'),
      Project.countDocuments(),
    ])
    res.json({
      data: items.filter((p) => p.owner).map((p) => shapeProject(p, p.owner)),
      meta: { page, limit, total },
    })
  } catch (err) { next(err) }
})

/* ============================ ERROR HANDLER ============================ */
router.use((err, req, res, next) => {          // eslint-disable-line no-unused-vars
  console.error(err)
  fail(res, 500, 'SERVER_ERROR', 'Something went wrong on our side.')
})

module.exports = router