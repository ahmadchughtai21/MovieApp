import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Section from '../components/Section'
import MediaRail from '../components/MediaRail'
import MediaCard from '../components/MediaCard'
import AutoHeroSlider from '../components/AutoHeroSlider'
import ContinueWatching from '../components/ContinueWatching'
import RecommendedForYou from '../components/RecommendedForYou'
import ActivityFeed from '../components/ActivityFeed'
import FeedSearch from '../components/FeedSearch'
import ClipsStrip from '../components/ClipsStrip'
import Icon from '../components/Icon'
import { CardSkeleton } from '../components/Loading'
import ErrorState from '../components/ErrorState'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function HomePage() {
  useDocumentTitle(null)
  const { user } = useAuth()
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
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="page page--bleed home-page">
        <div className="hero-slider skeleton-hero home-hero-skeleton" />
        <Section title="Trending movies">
          <CardSkeleton count={8} />
        </Section>
      </div>
    )
  }
  if (error) return <div className="page home-page"><ErrorState message={error} /></div>

  const name = user?.display_name || user?.username
  const movieTrending = data?.movies?.trending_this_week?.results || []
  const showTrending = data?.shows?.trending_this_week?.results || []
  const moviePopular = data?.movies?.popular?.results || []
  const showPopular = data?.shows?.popular?.results || []
  const movieTop = data?.movies?.top_rated?.results || []
  const showTop = data?.shows?.top_rated?.results || []

  const heroMovies = movieTrending.slice(0, 6)
  const heroShows = showTrending.slice(0, 4)
  const heroItems = []
  for (let i = 0; i < Math.max(heroMovies.length, heroShows.length); i += 1) {
    if (heroMovies[i]) heroItems.push(heroMovies[i])
    if (heroShows[i]) heroItems.push({ ...heroShows[i], __kind: 'show' })
  }

  return (
    <div className="page page--bleed home-page">
      <div className="home-hero">
        <AutoHeroSlider items={heroItems} kind="movie" limit={7} />
      </div>

      <header className="home-strip">
        <div className="home-strip__text">
          <p className="home-strip__eyebrow">{user ? greeting() : 'Welcome to Madflix'}</p>
          <p className="home-strip__title">
            {user ? `${name}, what did you watch?` : 'Track it. Rate it. Talk about it.'}
          </p>
        </div>
        <div className="home-strip__actions">
          {user ? (
            <>
              <Link to="/discover" className="btn btn--accent btn--sm">
                <Icon name="film" size={14} /> Discover
              </Link>
              <Link to="/diary" className="btn btn-ghost btn--sm">
                <Icon name="journal" size={14} /> Diary
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn--accent btn--sm">Join free</Link>
              <Link to="/login" className="btn btn-ghost btn--sm">Sign in</Link>
            </>
          )}
        </div>
      </header>

      <section className="home-feed home-feed--search">
        <FeedSearch />
      </section>

      <ClipsStrip />

      {user && <ContinueWatching />}

      <section className="home-feed">
        <ActivityFeed limit={15} showSuggested title="Community activity" />
      </section>

      {user && <RecommendedForYou />}

      <Section
        title="Trending movies"
        subtitle="What everyone's watching this week"
        action="/discover?tab=movie"
        actionLabel="More"
      >
        <MediaRail>
          {movieTrending.slice(0, 14).map((item) => (
            <MediaCard key={item.id} item={item} kind="movie" to={`/movie/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Trending shows"
        subtitle="Series people can't stop talking about"
        action="/discover?tab=tv"
        actionLabel="More"
      >
        <MediaRail>
          {showTrending.slice(0, 14).map((item) => (
            <MediaCard key={item.id} item={item} kind="show" to={`/show/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Popular right now"
        subtitle="Big titles across movies and series"
        action="/discover"
        actionLabel="Explore"
      >
        <MediaRail>
          {moviePopular.slice(0, 8).map((item) => (
            <MediaCard key={`mp-${item.id}`} item={item} kind="movie" to={`/movie/${item.id}`} />
          ))}
          {showPopular.slice(0, 8).map((item) => (
            <MediaCard key={`sp-${item.id}`} item={item} kind="show" to={`/show/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section
        title="Top rated"
        subtitle="Highest rated by the community and TMDB"
        action="/discover"
        actionLabel="See all"
      >
        <MediaRail>
          {movieTop.slice(0, 8).map((item) => (
            <MediaCard key={`mt-${item.id}`} item={item} kind="movie" to={`/movie/${item.id}`} />
          ))}
          {showTop.slice(0, 8).map((item) => (
            <MediaCard key={`st-${item.id}`} item={item} kind="show" to={`/show/${item.id}`} />
          ))}
        </MediaRail>
      </Section>
    </div>
  )
}
