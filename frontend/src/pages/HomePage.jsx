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
import SuggestedFollow from '../components/SuggestedFollow'
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

const QUICK_LINKS = [
  { to: '/swipe', label: 'CineSwipe', description: 'Find your taste match', icon: 'heart' },
  { to: '/communities', label: 'Communities', description: 'Live movie chat', icon: 'globe' },
  { to: '/messages', label: 'Messages', description: 'Your conversations', icon: 'chat' },
  { to: '/clips', label: 'Clips', description: 'Moments worth sharing', icon: 'clapper' },
]

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
  const upcoming = data?.movies?.upcoming?.results || []
  const airingToday = data?.shows?.airing_today?.results || []
  const movieGenres = data?.genres?.movies || []

  const heroMovies = movieTrending.slice(0, 6)
  const heroShows = showTrending.slice(0, 4)
  const heroItems = []
  for (let i = 0; i < Math.max(heroMovies.length, heroShows.length); i += 1) {
    if (heroMovies[i]) heroItems.push(heroMovies[i])
    if (heroShows[i]) heroItems.push({ ...heroShows[i], __kind: 'show' })
  }

  const excludeForRecommendations = [
    ...movieTrending.slice(0, 14),
    ...showTrending.slice(0, 14),
  ].map((item) => item.id)

  const initial = (name || '?').charAt(0).toUpperCase()
  const accent = user?.profile_accent_color || '#f5b942'
  const location = [user?.location_city, user?.location_country].filter(Boolean).join(', ')

  return (
    <div className="page page--bleed home-page">
      <div className="home-hero">
        <AutoHeroSlider items={heroItems} kind="movie" limit={7} />
      </div>

      <section className="home-intro">
        <div className="home-intro__main">
          {user ? (
            user.avatar_url ? (
              <img
                className="home-avatar"
                src={user.avatar_url}
                alt=""
                style={{ borderColor: accent, boxShadow: `0 0 0 3px ${accent}33` }}
              />
            ) : (
              <span
                className="home-avatar home-avatar--initial"
                style={{ borderColor: accent, boxShadow: `0 0 0 3px ${accent}33`, color: accent }}
              >
                {initial}
              </span>
            )
          ) : (
            <span className="home-avatar home-avatar--initial">M</span>
          )}

          <div className="home-intro__copy">
            <p className="home-strip__eyebrow">{user ? greeting() : 'Welcome to Madflix'}</p>
            <h1 className="home-strip__title">
              {user ? `${name}, what are we watching?` : 'Track it. Rate it. Talk about it.'}
            </h1>
            <p className="home-intro__meta">
              {user
                ? [location, user.is_vip ? 'VIP' : ''].filter(Boolean).join(' · ') || 'Your movie universe'
                : 'Your diary, your people, your next favourite film.'}
            </p>
          </div>
        </div>

        <div className="home-strip__actions">
          {user ? (
            <>
              <Link to="/swipe" className="btn btn--accent btn--sm">
                <Icon name="heart" size={14} /> CineSwipe
              </Link>
              <Link to="/diary" className="btn btn-ghost btn--sm">
                <Icon name="journal" size={14} /> Diary
              </Link>
              <Link to="/watchlist" className="btn btn-ghost btn--sm">
                <Icon name="bookmark" size={14} /> Watchlist
              </Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn--accent btn--sm">Join free</Link>
              <Link to="/login" className="btn btn-ghost btn--sm">Sign in</Link>
            </>
          )}
        </div>
      </section>

      {user && (
        <section className="home-quick" aria-label="Quick access">
          {QUICK_LINKS.map((item) => (
            <Link key={item.to} to={item.to} className="home-quick-card">
              <span className="home-quick-icon"><Icon name={item.icon} size={18} /></span>
              <span className="home-quick-copy">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </span>
              <Icon name="arrowRight" size={14} />
            </Link>
          ))}
        </section>
      )}

      {movieGenres.length > 0 && (
        <section className="home-genres" aria-label="Browse by genre">
          <div className="home-genres__head">
            <h2 className="section-title">Browse by mood</h2>
            <Link to="/discover" className="section-action">
              All genres <Icon name="arrowRight" size={12} />
            </Link>
          </div>
          <div className="home-genres__row">
            {movieGenres.slice(0, 10).map((genre) => (
              <Link
                key={genre.id}
                to={`/discover?tab=movie&genre=${genre.id}`}
                className="genre-chip"
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="home-feed home-feed--search">
        <FeedSearch />
      </section>

      <ClipsStrip />

      {user && <ContinueWatching />}

      <section className="home-feed">
        <ActivityFeed limit={12} showSuggested={false} title="Community activity" />
      </section>

      <SuggestedFollow />

      {user && <RecommendedForYou excludeIds={excludeForRecommendations} />}

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

      {upcoming.length > 0 && (
        <Section
          title="Coming soon"
          subtitle="Films heading to a screen near you"
          action="/discover?tab=movie"
          actionLabel="See all"
        >
          <MediaRail>
            {upcoming.slice(0, 14).map((item) => (
              <MediaCard key={`up-${item.id}`} item={item} kind="movie" to={`/movie/${item.id}`} />
            ))}
          </MediaRail>
        </Section>
      )}

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

      {airingToday.length > 0 && (
        <Section
          title="Airing today"
          subtitle="New episodes waiting for you"
          action="/discover?tab=tv"
          actionLabel="See all"
        >
          <MediaRail>
            {airingToday.slice(0, 14).map((item) => (
              <MediaCard key={`air-${item.id}`} item={item} kind="show" to={`/show/${item.id}`} />
            ))}
          </MediaRail>
        </Section>
      )}

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
