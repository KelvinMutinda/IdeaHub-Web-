import { Navigate, Route, Routes } from 'react-router-dom'
import { isAuthenticated } from './api'
import ProtectedLayout from './components/ProtectedLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

/* If you're already signed in, /login and /register skip straight to home. */
function PublicOnly({ children }) {
  return isAuthenticated() ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

      {/* Everything inside here requires a valid session */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Home />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}