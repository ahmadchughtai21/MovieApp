import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Icon from '../components/Icon'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function GenresPage() {
  useDocumentTitle('Genres')
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    let active = true
    api.allGenres()
      .then((data) => {
        if (active) setState({ loading: false, error: null, data })
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error.message, data: null })
      })
    return () => {
      active = false
    }
  }, [])

  if (state.loading) return <Loading label="Loading genres" />
  if (state.error) return <ErrorState message={state.error} />

  const movieGenres = state.data?.movie_genres || []
  const showGenres = state.data?.show_genres || []

  return (
    <div className="page genres-page">
      <div className="genres-hero">
        <div className="genres-hero-content">
          <h1 className="genres-title">Browse Genres</h1>
          <p className="genres-subtitle">Find your next favorite movie or show by genre</p>
        </div>
      </div>

      <div className="genres-section">
        <div className="genres-section-header">
          <h2 className="genres-section-title">Movies</h2>
          <p className="genres-section-sub">Explore movie universes</p>
        </div>
        {movieGenres.length === 0 ? (
          <div className="genres-empty">
            <p>No movie genres available right now.</p>
          </div>
        ) : (
          <div className="genres-grid">
            {movieGenres.map((genre) => (
              <button
                key={genre.id}
                className="genre-card-new"
                onClick={() => navigate(`/movies?genre=${genre.id}`)}
              >
                <span className="genre-card-name">{genre.name}</span>
                <span className="genre-card-icon">
                  <Icon name="arrowRight" size={16} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="genres-section">
        <div className="genres-section-header">
          <h2 className="genres-section-title">TV Shows</h2>
          <p className="genres-section-sub">Find your next binge</p>
        </div>
        {showGenres.length === 0 ? (
          <div className="genres-empty">
            <p>No show genres available right now.</p>
          </div>
        ) : (
          <div className="genres-grid">
            {showGenres.map((genre) => (
              <button
                key={genre.id}
                className="genre-card-new"
                onClick={() => navigate(`/shows?genre=${genre.id}`)}
              >
                <span className="genre-card-name">{genre.name}</span>
                <span className="genre-card-icon">
                  <Icon name="arrowRight" size={16} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
