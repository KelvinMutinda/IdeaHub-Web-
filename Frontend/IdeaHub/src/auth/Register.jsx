import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, saveSession } from '../api'
import toast, { Toaster } from 'react-hot-toast'

/* Password strength: 0 (empty) – 4 (strong) */
const getStrength = (pw) => {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong']

const Register = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [fileNames, setFileNames] = useState({ profile: '', resume: '' })
  const [fieldErrors, setFieldErrors] = useState({})     // messages from the server, per input
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const fe = (name) => (fieldErrors[name] ? <span className="field-error">{fieldErrors[name]}</span> : null)
  const bad = (name) => (fieldErrors[name] ? 'input-invalid' : undefined)

  const strength = getStrength(password)

  const handleFile = (e) => {
    const { name, files } = e.target
    setFileNames((prev) => ({ ...prev, [name]: files[0] ? files[0].name : '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldErrors({})

    if (password.length < 8) {
      setFieldErrors({ password: 'Your password must be at least 8 characters long.' })
      toast.error('Your password must be at least 8 characters long.')
      return
    }

    setSubmitting(true)
    const data = new FormData(e.target)   // includes the profile picture and resume files

    try {
      const res = await api('/register', { method: 'POST', body: data })
      saveSession(res, true)               // you are logged in right after registering
      toast.success('Account created! Welcome to IdeaHub.')
      setTimeout(() => navigate('/Login'), 1200)
    } catch (err) {
      setFieldErrors(err.fields || {})
      toast.error(err.message)      // e.g. "An account with this email already exists."
      setSubmitting(false)
    }
  }

  return (
    <div className="register">
      <Toaster position="top-right" />

      {/* ───────── Header ───────── */}
      <header className="header">
        <div className="ideaHub">
          <img src="/Glowing Lightbulb Orbit App Icon.png" className="img" alt="IdeaHub logo" />
          <h3>IDEAHUB</h3>
        </div>
        <div className="login">
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </header>

      {/* ───────── Card ───────── */}
      <main className="form">
        {/* Left: brand panel */}
        <aside className="section1">
          <img src="/istockphoto-2172317014-612x612.jpg" alt="" />
          <div className="ideas">
            <span className="ideas-badge">Welcome to</span>
            <h1>IDEAHUB</h1>
            <h3>Turn your project ideas into currency</h3>
            <p>Get your job matching gig in seconds</p>
            <ul className="ideas-points">
              <li>Showcase your skills and resume</li>
              <li>Get matched with gigs that fit you</li>
              <li>Turn ideas into paid projects</li>
            </ul>
          </div>
        </aside>

        {/* Right: form */}
        <section className="section2">
          <form onSubmit={handleSubmit} noValidate={false}>
            <div className="form-head">
              <h3>Create your IdeaHub account</h3>
              <p className="form-sub">It only takes a minute. Fields marked * are required.</p>
            </div>

            {/* Personal */}
            <p className="form-section">Personal details</p>
            <div className="div-group">
              <div className="div-group1">
                <label htmlFor="firstname">First name *</label>
                <input id="firstname" type="text" name="firstname" placeholder="e.g. John" className={bad('firstname')} required />
                {fe('firstname')}
              </div>
              <div className="div-group1">
                <label htmlFor="lastname">Last name *</label>
                <input id="lastname" type="text" name="lastname" placeholder="e.g. Klein" className={bad('lastname')} required />
                {fe('lastname')}
              </div>
              <div className="div-group2">
                <label htmlFor="email">Email *</label>
                <input id="email" type="email" name="email" placeholder="e.g. klein@gmail.com" className={bad('email')} required />
                {fe('email')}
              </div>
              <div className="div-group1">
                <label htmlFor="phone">Phone number</label>
                <input id="phone" type="tel" name="phone" placeholder="e.g. +254 700 000000" />
              </div>
              <div className="div-group1">
                <label htmlFor="occupation">Occupation</label>
                <input id="occupation" type="text" name="occupation" placeholder="e.g. Software engineer" />
              </div>
            </div>

            {/* Profile */}
            <p className="form-section">Your profile</p>
            <div className="div-group">
              <div className="div-group2">
                <label htmlFor="skills">Skills</label>
                <input id="skills" type="text" name="skills" placeholder="e.g. Web development, Data analysis" />
                <span className="field-hint">Separate your skills with commas.</span>
              </div>
              <div className="div-group2">
                <label htmlFor="bio">Bio</label>
                <textarea id="bio" name="bio" placeholder="Tell clients a little about yourself and what you build…" />
              </div>
              <div className="div-group1">
                <label htmlFor="profile">Profile picture</label>
                <input id="profile" type="file" name="profile" accept="image/*" onChange={handleFile} />
                {fileNames.profile && <span className="file-name">{fileNames.profile}</span>}
              </div>
              <div className="div-group1">
                <label htmlFor="resume">Resume</label>
                <input id="resume" type="file" name="resume" accept=".pdf,.doc,.docx" onChange={handleFile} />
                {fileNames.resume && <span className="file-name">{fileNames.resume}</span>}
              </div>
            </div>

            {/* Security */}
            <p className="form-section">Security</p>
            <div className="div-group">
              <div className="div-group2">
                <label htmlFor="password">Password *</label>
                <div className="password-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Create your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={bad('password')}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-pass"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {password && (
                  <div className="strength" data-level={strength}>
                    <div className="strength-bars">
                      <span /><span /><span /><span />
                    </div>
                    <span className="strength-label">{STRENGTH_LABELS[strength]}</span>
                  </div>
                )}
                {fe('password')}
                <span className="field-hint">Use 8+ characters with upper and lower case letters, a number and a symbol.</span>
              </div>
            </div>

            <button type="submit" className="create" disabled={submitting}>
              {submitting ? 'Creating your account…' : 'Create your account'}
            </button>

            <p className="switch-auth">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </form>
        </section>
      </main>
    </div>
  )
}

export default Register