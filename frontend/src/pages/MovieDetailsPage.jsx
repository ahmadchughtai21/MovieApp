import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { formatRuntime, compactNumber, formatMoney, formatLanguage } from '../lib/format'
import MediaCard from '../components/MediaCard'
import MediaRail from '../components/MediaRail'
import CastList from '../components/CastList'
import VideoRail from '../components/VideoRail'
import Icon from '../components/Icon'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import Player from '../components/Player'
import WhereToWatch from '../components/WhereToWatch'
import WatchlistButton from '../components/WatchlistButton'
import LogModal from '../components/LogModal'
import ReviewsSection from '../components/ReviewsSection'
import MediaClips from '../components/MediaClips'
import { buildStreamSources } from '../lib/streamSources'

function Fact({ label, value }) {
  if (!value) return null
  return (
    <div className="md-fact">
      <dt className="md-fact-label">{label}</dt>
      <dd className="md-fact-value">{value}</dd>
    </div>
  )
}

export default function MovieDetailsPage() {
  const { id } = useParams()
  const config = useImageConfig()
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [recs, setRecs] = useState([])
  const [logOpen, setLogOpen] = useState(false)
  const [logStats, setLogStats] = useState(null)
  const [myLog, setMyLog] = useState(null)
  const { user } = useAuth()

  const refreshMyLog = useCallback(() => {
    if (!user) { setMyLog(null); return }
    api.logForMovie(id, 'movie')
      .then((logs) => setMyLog(logs.find((l) => l.username === user.username && l.media_type === 'movie') || null))
      .catch(() => {})
  }, [id, user])

  useEffect(() => {
    let active = true
    setState({ loading: true, error: null, data: null })
    api.movieDetails(id)
      .then((data) => { if (active) setState({ loading: false, error: null, data }) })
      .catch((error) => { if (active) setState({ loading: false, error: error.message, data: null }) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    let active = true
    api.movieRecommendations(id)
      .then((data) => { if (active) setRecs(data.results || []) })
      .catch(() => {})
    return () => { active = false }
  }, [id])

  useEffect(() => {
    api.logStats(id).then(setLogStats).catch(() => {})
  }, [id])

  useEffect(() => { refreshMyLog() }, [refreshMyLog])

  const details = state.data?.movie_details
  useDocumentTitle(details?.title)

  const streamSources = useMemo(
    () => buildStreamSources({ id: details?.id }),
    [details?.id]
  )

  if (state.loading) return <Loading label="Loading movie" />
  if (state.error) return <ErrorState message={state.error} />
  if (!details) return <ErrorState message="No movie data available" />

  const credits = state.data?.credits
  const videos = state.data?.videos?.results || []
  const similar = recs.length > 0 ? recs : (state.data?.similar_movies?.results || [])

  const backdrop = buildImageUrl(config, details.backdrop_path, 'backdrop', 'original')
  const poster = buildImageUrl(config, details.poster_path, 'poster', 'w500')
  const releaseYear = details.release_date ? new Date(details.release_date).getFullYear() : null
  const rating = details.vote_average ? details.vote_average.toFixed(1) : null

  const facts = [
    { label: 'Status', value: details.status },
    { label: 'Released', value: details.release_date },
    { label: 'Runtime', value: details.runtime ? formatRuntime(details.runtime) : null },
    { label: 'Budget', value: formatMoney(details.budget) },
    { label: 'Revenue', value: formatMoney(details.revenue) },
    { label: 'Language', value: formatLanguage(details.original_language) },
    { label: 'Rated', value: details.certification || (details.adult ? 'Adult' : null) },
  ].filter((f) => f.value)

  const companies = (details.production_companies || []).slice(0, 4)

  return (
    <div className="md-page">
      <section className="md-hero">
        <div className="md-backdrop" style={backdrop ? { backgroundImage: `url(${backdrop})` } : {}} />
        <div className="md-overlay" />

        <div className="md-hero-inner">
          <div className="md-poster-wrap">
            <div className="md-poster">
              {poster ? <img src={poster} alt={details.title} /> : <div className="md-poster-fallback">No image</div>}
            </div>
          </div>

          <div className="md-info">
            <span className="md-type">Movie</span>
            <h1 className="md-title">{details.title}</h1>
            {details.tagline && <p className="md-tagline">{details.tagline}</p>}

            <div className="md-meta">
              {releaseYear && <span className="md-meta-item">{releaseYear}</span>}
              {rating && (
                <span className="md-meta-item md-rating">
                  <Icon name="star" size={14} /> {rating}
                </span>
              )}
              {details.runtime && <span className="md-meta-item">{formatRuntime(details.runtime)}</span>}
              {details.vote_count > 0 && <span className="md-meta-item">{compactNumber(details.vote_count)} votes</span>}
            </div>

            {details.overview && <p className="md-overview">{details.overview}</p>}

            {details.genres?.length > 0 && (
              <div className="md-genres">
                {details.genres.map((g) => (
                  <Link key={g.id} to={`/discover?tab=movie&genre=${g.id}`} className="md-chip">{g.name}</Link>
                ))}
              </div>
            )}

            <div className="md-actions">
              <a href="#watch" className="btn btn--accent">
                <Icon name="play" size={15} />
                <span>Watch</span>
              </a>
              <WatchlistButton tmdbId={details.id} mediaType="movie" title={details.title} posterPath={details.poster_path} />
              <button className="btn btn-ghost" onClick={() => setLogOpen(true)}>
                <Icon name="check" size={16} />
                <span>{myLog ? 'Edit Diary' : 'Add to diary'}</span>
              </button>
              {logStats && logStats.avg_rating && (
                <span className="md-avg-rating">
                  <Icon name="star" size={14} /> {Number(logStats.avg_rating).toFixed(1)}
                  <span className="md-avg-rating__count">({logStats.total_logs})</span>
                </span>
              )}
            </div>

            <WhereToWatch kind="movie" id={details.id} title={details.title} />
          </div>
        </div>
      </section>

      {logOpen && (
        <LogModal
          tmdbId={details.id}
          mediaType="movie"
          title={details.title}
          posterPath={details.poster_path}
          onClose={() => { setLogOpen(false); api.logStats(id).then(setLogStats).catch(() => {}); refreshMyLog() }}
        />
      )}

      <section className="md-player-section" id="watch">
        <h2 className="md-section-title">Watch Now</h2>
        <Player
          key={details.id}
          sources={streamSources}
          title={`Stream ${details.title}`}
          tmdbId={details.id}
          mediaType="movie"
          posterPath={details.poster_path}
        />
      </section>

      {(facts.length > 0 || companies.length > 0) && (
        <section className="md-section">
          <h2 className="md-section-title">Details</h2>
          <div className="md-facts">
            <dl className="md-facts-grid">
              {facts.map((f) => (
                <Fact key={f.label} label={f.label} value={f.value} />
              ))}
            </dl>
            {companies.length > 0 && (
              <div className="md-companies">
                <span className="md-companies-label">Production</span>
                <span className="md-companies-list">
                  {companies.map((c) => c.name).join(' · ')}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      <MediaClips tmdbId={id} mediaType="movie" />

      <ReviewsSection tmdbId={id} mediaType="movie" />

      {credits?.cast?.length > 0 && (
        <section className="md-section">
          <h2 className="md-section-title">Cast</h2>
          <CastList cast={credits.cast.slice(0, 12)} />
        </section>
      )}

      {videos.length > 0 && (
        <section className="md-section">
          <h2 className="md-section-title">Trailers & Clips</h2>
          <VideoRail videos={videos} />
        </section>
      )}

      {similar.length > 0 && (
        <section className="md-section">
          <h2 className="md-section-title">You might also like</h2>
          <MediaRail>
            {similar.slice(0, 12).map((item) => (
              <MediaCard key={item.id} item={item} kind="movie" to={`/movie/${item.id}`} />
            ))}
          </MediaRail>
        </section>
      )}
    </div>
  )
}
