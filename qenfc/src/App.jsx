import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import EditPortfolio from './pages/EditPortfolio.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import NotFound from './pages/NotFound.jsx'

// The admin panel URL is a build-time secret (set via the VITE_ADMIN_PATH
// environment variable in the Cloudflare dashboard) so it isn't guessable.
// See setup.txt for the exact link once you've set this.
const ADMIN_PATH = import.meta.env.VITE_ADMIN_PATH || 'admin-panel'

export default function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:code" element={<EditPortfolio />} />
        <Route path={`/${ADMIN_PATH}`} element={<AdminPanel />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}
