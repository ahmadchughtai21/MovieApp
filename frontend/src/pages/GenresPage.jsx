import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Section from '../components/Section'
import Icon from '../components/Icon'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function GenresPage() {
  useDocumentTitle('Genres')
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
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Genres</h1>
          <p className="page-sub">Jump into curated movie and series collections.</p>
        </div>
      </div>

      <Section title="Movies" subtitle="Explore movie universes">
        {movieGenres.length === 0 ? (
          <div className="state">
            <p>No movie genres available right now.</p>
          </div>
        ) : (
          <div className="genre-grid">
            {movieGenres.map((genre) => (
              <a key={genre.id} className="genre-card" href={`/movies?genre=${genre.id}`}>
                <span>{genre.name}</span>
                <Icon name="arrowRight" size={14} />
              </a>
            ))}
          </div>
        )}
      </Section>

      <Section title="TV Shows" subtitle="Find your next binge">
        {showGenres.length === 0 ? (
          <div className="state">
            <p>No show genres available right now.</p>
          </div>
        ) : (
          <div className="genre-grid">
            {showGenres.map((genre) => (
              <a key={genre.id} className="genre-card" href={`/shows?genre=${genre.id}`}>
                <span>{genre.name}</span>
                <Icon name="arrowRight" size={14} />
              </a>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
