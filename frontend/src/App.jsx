import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { ImageConfigProvider } from './lib/imageConfig'
import { AuthProvider } from './contexts/AuthContext'
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

function MovieRedirect() {
  const { id } = useParams()
  return <Navigate to={`/movie/${id}`} replace />
}

function ShowRedirect() {
  const { id } = useParams()
  return <Navigate to={`/show/${id}`} replace />
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
            <Route path="/clips" element={<ClipsPage />} />
            <Route path="/clips/:clipId" element={<ClipsPage />} />
            <Route path="/user/:username" element={<ProfilePage />} />

            {/* Legacy URL redirects */}
            <Route path="/feed" element={<Navigate to="/" replace />} />
            <Route path="/movies" element={<Navigate to="/discover?tab=movie" replace />} />
            <Route path="/shows" element={<Navigate to="/discover?tab=tv" replace />} />
            <Route path="/genres" element={<Navigate to="/discover" replace />} />
            <Route path="/movies/:id" element={<MovieRedirect />} />
            <Route path="/shows/:id" element={<ShowRedirect />} />
            <Route path="/saved" element={<Navigate to="/watchlist" replace />} />
            <Route path="/logs" element={<Navigate to="/diary" replace />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ImageConfigProvider>
    </AuthProvider>
  )
}
