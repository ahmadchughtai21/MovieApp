import { Routes, Route, Navigate, Link, useParams } from 'react-router-dom'
import { ImageConfigProvider } from './lib/imageConfig'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import DiscoverPage from './pages/DiscoverPage'
import MovieDetailsPage from './pages/MovieDetailsPage'
import ShowDetailsPage from './pages/ShowDetailsPage'
import SearchPage from './pages/SearchPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import WatchlistPage from './pages/WatchlistPage'
import LogsPage from './pages/LogsPage'
import ProfilePage from './pages/ProfilePage'
import NotFound from './pages/NotFound'
import ClipsPage from './pages/ClipsPage'
import CineSwipePage from './pages/CineSwipePage'
import CommunitiesPage from './pages/CommunitiesPage'
import DirectMessagesPage from './pages/DirectMessagesPage'
import ReviewPage from './pages/ReviewPage'
import SettingsPage from './pages/SettingsPage'

const MORE_LINKS = [
  { to: '/discover', label: 'Discover', description: 'Browse movies and TV shows' },
  { to: '/clips', label: 'Clips', description: 'Short movie moments' },
  { to: '/diary', label: 'Diary', description: 'Your logged watches' },
  { to: '/watchlist', label: 'Watchlist', description: 'Titles you saved' },
]

function MorePage() {
  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
      <div className="page-head">
        <h1>More</h1>
        <p className="page-sub">Everything else in Madflix.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {MORE_LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            style={{
              display: 'grid',
              gap: 4,
              padding: 16,
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <span style={{ fontWeight: 800 }}>{item.label}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.description}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function MovieRedirect() {
  const { id } = useParams()
  return <Navigate to={`/movie/${id}`} replace />
}

function ShowRedirect() {
  const { id } = useParams()
  return <Navigate to={`/show/${id}`} replace />
}

function ProfileRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  return <Navigate to={user ? `/user/${user.username}` : '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ImageConfigProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/movie/:id" element={<MovieDetailsPage />} />
            <Route path="/show/:id" element={<ShowDetailsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/diary" element={<LogsPage />} />
            <Route path="/review/:logId" element={<ReviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/clips" element={<ClipsPage />} />
            <Route path="/clips/:clipId" element={<ClipsPage />} />
            <Route path="/cineswipe" element={<Navigate to="/swipe" replace />} />
            <Route path="/swipe" element={<CineSwipePage />} />
            <Route path="/communities" element={<CommunitiesPage />} />
            <Route path="/messages" element={<DirectMessagesPage />} />
            <Route path="/circles" element={<Navigate to="/communities" replace />} />
            <Route path="/dms" element={<Navigate to="/messages" replace />} />
            <Route path="/user/:username" element={<ProfilePage />} />
            <Route path="/profile" element={<ProfileRedirect />} />

            {/* Legacy URL redirects */}
            <Route path="/feed" element={<Navigate to="/" replace />} />
            <Route path="/movies" element={<Navigate to="/discover?tab=movie" replace />} />
            <Route path="/shows" element={<Navigate to="/discover?tab=tv" replace />} />
            <Route path="/genres" element={<Navigate to="/discover" replace />} />
            <Route path="/movies/:id" element={<MovieRedirect />} />
            <Route path="/shows/:id" element={<ShowRedirect />} />
            <Route path="/saved" element={<Navigate to="/watchlist" replace />} />
            <Route path="/logs" element={<Navigate to="/diary" replace />} />
            <Route path="/history" element={<Navigate to="/diary" replace />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ImageConfigProvider>
    </AuthProvider>
  )
}
