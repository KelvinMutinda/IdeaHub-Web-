require('dotenv').config()          // load .env first
const path = require('path')
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const app = express()

// Origins allowed to call this API. No trailing slashes: the browser's Origin header never has one.
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://idea-hub-web-one.vercel.app',
  // optional extra origins from the environment, comma-separated
  ...(process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),
]

app.use(
  cors({
    origin(origin, callback) {
      // no Origin header = non-browser request (curl, health checks): allow it
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
      return callback(null, false) // browser origin not on the list: no CORS headers sent
    },
  })
)
app.use(express.json())

// uploaded profile pictures and resumes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const PORT = process.env.PORT || 4000
const MONGO_URI = process.env.MONGO_URI

if (!MONGO_URI) {
  console.error('MONGO_URI is missing in your .env file')
  process.exit(1)
}

app.get('/', (req, res) => res.json({ status: 'ok' }))

// register, login, post a project, project feed  ->  /api/register, /api/login, /api/projects
app.use('/api', require('./auth/routes'))

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Database connected successfully')
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message)
    process.exit(1)
  })
