import { Routes, Route } from 'react-router-dom'
import { ImageConfigProvider } from './lib/imageConfig'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import MoviesPage from './pages/MoviesPage'
import ShowsPage from './pages/ShowsPage'
import MovieDetailsPage from './pages/MovieDetailsPage'
import ShowDetailsPage from './pages/ShowDetailsPage'
import SearchPage from './pages/SearchPage'
import GenresPage from './pages/GenresPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
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
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ImageConfigProvider>
  )
}
