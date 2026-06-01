import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import Hero from '../components/Hero'
import Section from '../components/Section'
import MediaRail from '../components/MediaRail'
import MediaCard from '../components/MediaCard'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function HomePage() {
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

  if (loading) return <Loading label="Loading home..." />
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

  return (
    <div className="page">
      <Hero item={heroItem} kind={heroKind} />

      <Section
        title="Trending movies"
        subtitle="Fresh picks from this week"
        action={<Link to="/movies?category=trending">View all</Link>}
      >
        <MediaRail>
          {movieTrending.map((item) => (
            <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} compact />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Popular movies"
        subtitle="Crowd favorites"
        action={<Link to="/movies?category=popular">View all</Link>}
      >
        <MediaRail>
          {moviePopular.map((item) => (
            <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} compact />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Upcoming movies"
        subtitle="Keep your watchlist ready"
        action={<Link to="/movies?category=upcoming">View all</Link>}
      >
        <MediaRail>
          {movieUpcoming.map((item) => (
            <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} compact />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Top rated movies"
        subtitle="Critics and fans agree"
        action={<Link to="/movies?category=top-rated">View all</Link>}
      >
        <MediaRail>
          {movieTopRated.map((item) => (
            <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} compact />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Trending shows"
        subtitle="Binge-worthy series"
        action={<Link to="/shows?category=trending">View all</Link>}
      >
        <MediaRail>
          {showTrending.map((item) => (
            <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} compact />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Airing today"
        subtitle="Fresh episodes"
        action={<Link to="/shows?category=airing-today">View all</Link>}
      >
        <MediaRail>
          {showAiring.map((item) => (
            <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} compact />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="On the air"
        subtitle="Currently running series"
        action={<Link to="/shows?category=on-the-air">View all</Link>}
      >
        <MediaRail>
          {showOnAir.map((item) => (
            <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} compact />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Top rated shows"
        subtitle="Beloved by audiences"
        action={<Link to="/shows?category=top-rated">View all</Link>}
      >
        <MediaRail>
          {showTopRated.map((item) => (
            <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} compact />
          ))}
        </MediaRail>
      </Section>

      <Section title="Explore by genre" subtitle="Pick a mood and dive in">
        <div className="genre-grid">
          {data?.genres?.movies?.map((genre) => (
            <Link key={genre.id} to={`/movies?genre=${genre.id}`} className="genre-chip">
              {genre.name}
            </Link>
          ))}
          {data?.genres?.shows?.map((genre) => (
            <Link key={`show-${genre.id}`} to={`/shows?genre=${genre.id}`} className="genre-chip">
              {genre.name}
            </Link>
          ))}
        </div>
      </Section>
    </div>
  )
}
