import { Routes, Route } from 'react-router-dom'
import { ImageConfigProvider } from './lib/imageConfig'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import MoviesPage from './pages/MoviesPage'
import ShowsPage from './pages/ShowsPage'
import MovieDetailsPage from './pages/MovieDetailsPage'
import ShowDetailsPage from './pages/ShowDetailsPage'
import SearchPage from './pages/SearchPage'
import GenresPage from './pages/GenresPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import WatchlistPage from './pages/WatchlistPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <ImageConfigProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/movies/:id" element={<MovieDetailsPage />} />
            <Route path="/shows" element={<ShowsPage />} />
            <Route path="/shows/:id" element={<ShowDetailsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/genres" element={<GenresPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ImageConfigProvider>
    </AuthProvider>
  )
}
