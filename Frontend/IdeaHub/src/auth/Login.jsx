import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, saveSession } from '../api'
import toast, { Toaster } from 'react-hot-toast'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Set by Register after a successful sign-up, and by RequireAuth when a protected page was blocked
  const justRegistered = location.state?.registered
  const redirectTo = location.state?.from?.pathname || '/'

  const [values, setValues] = useState({ email: location.state?.email || '', password: '' })
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!values.email.trim() || !values.password) {
      toast.error('Please enter your email and password.')
      return
    }

    setSubmitting(true)
    try {
      const data = await api('/login', {
        method: 'POST',
        body: { email: values.email.trim(), password: values.password },
      })

      if (!data?.token) throw new Error('Login failed: the server did not return a token.')

      // Stores token + user + 2-day expiry. "Remember me" decides localStorage vs sessionStorage.
      saveSession(data, remember)

      const name = data.user?.name || data.user?.firstname || ''
      toast.success(name ? `Welcome back, ${name}!` : 'Welcome back!')
      setTimeout(() => navigate(redirectTo, { replace: true }), 900)
      // submitting stays true so the button can't be clicked again while redirecting
    } catch (err) {
      toast.error(err.message)               // e.g. "Incorrect email or password."
      setSubmitting(false)
    }
  }

  return (
    <div className="register">
      <Toaster position="top-right" />

      <div className="header">
        <div className="ideaHub">
          <img src="/Glowing Lightbulb Orbit App Icon.png" className="img" alt="IdeaHub logo" />
          <h3>IDEAHUB</h3>
        </div>
        <div className="login">
          <p>New to IdeaHub? <Link to="/register">Create an account</Link></p>
        </div>
      </div>

      <div className="form login-card">
        <div className="section1">
          <img src="/istockphoto-2172317014-612x612.jpg" alt="" />
        </div>

        <div className="section2">
          <form onSubmit={handleSubmit} noValidate>
            <h3>WELCOME BACK</h3>
            <p className="login-sub">Log in to continue to your IdeaHub account.</p>

            {justRegistered && (
              <p className="login-sub" role="status">
                Account created. Please log in.
              </p>
            )}

            <div className="div-group2">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={values.email}
                onChange={handleChange}
                placeholder="eg. klein@gmail.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="div-group2">
              <label htmlFor="password">Password</label>
              <div className="password-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={values.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  autoFocus={!!values.email}
                  required
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
              </label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            <button type="submit" className="create" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log in'}
            </button>

            <p className="switch-auth">
              Don't have an account? <Link to="/register">Register</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login