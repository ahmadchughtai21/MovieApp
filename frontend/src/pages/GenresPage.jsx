import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Section from '../components/Section'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function GenresPage() {
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
      <Section title="Movie genres" subtitle="Jump into movie universes">
        <div className="genre-grid">
          {movieGenres.map((genre) => (
            <a key={genre.id} className="genre-card" href={`/movies?genre=${genre.id}`}>
              <div className="genre-title">{genre.name}</div>
              <div className="genre-sub">Explore movies</div>
            </a>
          ))}
        </div>
      </Section>

      <Section title="Show genres" subtitle="Pick your next series">
        <div className="genre-grid">
          {showGenres.map((genre) => (
            <a key={genre.id} className="genre-card" href={`/shows?genre=${genre.id}`}>
              <div className="genre-title">{genre.name}</div>
              <div className="genre-sub">Explore shows</div>
            </a>
          ))}
        </div>
      </Section>
    </div>
  )
}
