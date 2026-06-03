import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Hero from '../components/Hero'
import Section from '../components/Section'
import MediaRail from '../components/MediaRail'
import MediaCard from '../components/MediaCard'
import { HeroSkeleton, CardSkeleton } from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function HomePage() {
  useDocumentTitle(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    api.home()
      .then((payload) => {
        if (active) {
          setData(payload)
          setError('')
        }
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="page">
        <HeroSkeleton />
        <Section title="Trending movies">
          <CardSkeleton count={8} />
        </Section>
        <Section title="Top rated shows">
          <CardSkeleton count={8} />
        </Section>
      </div>
    )
  }
  if (error) return <ErrorState message={error} />

  const movieTrending = data?.movies?.trending_this_week?.results || []
  const moviePopular = data?.movies?.popular?.results || []
  const movieUpcoming = data?.movies?.upcoming?.results || []
  const movieTopRated = data?.movies?.top_rated?.results || []

  const showTrending = data?.shows?.trending_this_week?.results || []
  const showAiring = data?.shows?.airing_today?.results || []
  const showOnAir = data?.shows?.on_the_air?.results || []
  const showTopRated = data?.shows?.top_rated?.results || []

  const heroItem = movieTrending[0] || showTrending[0]
  const heroKind = movieTrending[0] ? 'movie' : 'show'

  const movieGenres = data?.genres?.movies || []
  const showGenres = data?.genres?.shows || []

  return (
    <div className="page">
      <Hero item={heroItem} kind={heroKind} />

      <Section
        title="Trending movies"
        subtitle="What everyone's watching this week"
        action="/movies?category=trending"
      >
        <MediaRail>
          {movieTrending.map((item) => (
            <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Popular movies"
        subtitle="Crowd favorites right now"
        action="/movies?category=popular"
      >
        <MediaRail>
          {moviePopular.map((item) => (
            <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Trending shows"
        subtitle="Binge-worthy series"
        action="/shows?category=trending"
      >
        <MediaRail>
          {showTrending.map((item) => (
            <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Upcoming movies"
        subtitle="Coming soon to theaters"
        action="/movies?category=upcoming"
      >
        <MediaRail>
          {movieUpcoming.map((item) => (
            <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Airing today"
        subtitle="Fresh episodes dropping today"
        action="/shows?category=airing-today"
      >
        <MediaRail>
          {showAiring.map((item) => (
            <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Top rated movies"
        subtitle="Critics and fans agree"
        action="/movies?category=top-rated"
      >
        <MediaRail>
          {movieTopRated.map((item) => (
            <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="On the air"
        subtitle="Currently running series"
        action="/shows?category=on-the-air"
      >
        <MediaRail>
          {showOnAir.map((item) => (
            <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Top rated shows"
        subtitle="Beloved by audiences"
        action="/shows?category=top-rated"
      >
        <MediaRail>
          {showTopRated.map((item) => (
            <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section title="Browse by genre" subtitle="Pick a mood and dive in">
        <div className="genre-grid">
          {[...movieGenres.slice(0, 8), ...showGenres.slice(0, 8)].map((genre) => (
            <a
              key={genre.id}
              className="genre-card"
              href={`/movies?genre=${genre.id}`}
            >
              <span>{genre.name}</span>
            </a>
          ))}
        </div>
      </Section>
    </div>
  )
}
