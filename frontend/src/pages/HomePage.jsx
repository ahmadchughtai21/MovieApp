import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Hero from '../components/Hero'
import Section from '../components/Section'
import MediaRail from '../components/MediaRail'
import MediaCard from '../components/MediaCard'
import ContinueWatching from '../components/ContinueWatching'
import { HeroSkeleton, CardSkeleton } from '../components/Loading'
import ErrorState from '../components/ErrorState'
import RickrollAd from '../components/RickrollAd'

export default function HomePage() {
  useDocumentTitle(null)
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [watchlist, setWatchlist] = useState([])
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
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!user) return
    let active = true
    api.watchlist()
      .then((items) => { if (active) setWatchlist(items) })
      .catch(() => {})
    return () => { active = false }
  }, [user])

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

  const heroItems = movieTrending.length > 0 ? movieTrending.slice(0, 5) : showTrending.slice(0, 5)
  const heroKind = movieTrending.length > 0 ? 'movie' : 'show'

  const movieGenres = data?.genres?.movies || []
  const showGenres = data?.genres?.shows || []

  return (
    <div className="page home-page">
      <RickrollAd />
      <Hero items={heroItems} kind={heroKind} />

      <ContinueWatching />

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

      {watchlist.length > 0 && (
        <Section
          title="Your watchlist"
          subtitle="Saved for later"
          action="/watchlist"
        >
          <MediaRail>
            {watchlist.map((item) => (
              <MediaCard
                key={`${item.tmdb_id}-${item.media_type}`}
                item={{ id: item.tmdb_id, title: item.title, poster_path: item.poster_path, media_type: item.media_type === 'tv' ? 'tv' : 'movie' }}
                kind={item.media_type === 'tv' ? 'show' : 'movie'}
                to={item.media_type === 'tv' ? `/shows/${item.tmdb_id}` : `/movies/${item.tmdb_id}`}
              />
            ))}
          </MediaRail>
        </Section>
      )}

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
