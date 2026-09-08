import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { formatDate, formatRuntime, compactNumber } from '../lib/format'
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
import { buildStreamSources } from '../lib/streamSources'

export default function MovieDetailsPage() {
  const { id } = useParams()
  const config = useImageConfig()
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    let active = true
    setState({ loading: true, error: null, data: null })
    api.movieDetails(id)
      .then((data) => { if (active) setState({ loading: false, error: null, data }) })
      .catch((error) => { if (active) setState({ loading: false, error: error.message, data: null }) })
    return () => { active = false }
  }, [id])

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
  const similar = state.data?.similar_movies?.results || []

  const backdrop = buildImageUrl(config, details.backdrop_path, 'backdrop', 'original')
  const poster = buildImageUrl(config, details.poster_path, 'poster', 'w500')
  const releaseYear = details.release_date ? new Date(details.release_date).getFullYear() : null
  const rating = details.vote_average ? details.vote_average.toFixed(1) : null

  return (
    <div className="md-page">
      {/* Full-screen hero */}
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
                  <Icon name="star" size={16} /> {rating}
                </span>
              )}
              {details.runtime && <span className="md-meta-item">{formatRuntime(details.runtime)}</span>}
              {details.vote_count > 0 && <span className="md-meta-item">{compactNumber(details.vote_count)} votes</span>}
            </div>

            {details.overview && <p className="md-overview">{details.overview}</p>}

            {details.genres?.length > 0 && (
              <div className="md-genres">
                {details.genres.map((g) => (
                  <Link key={g.id} to={`/movies?genre=${g.id}`} className="md-chip">{g.name}</Link>
                ))}
              </div>
            )}

            <div className="md-actions">
              <WatchlistButton tmdbId={details.id} mediaType="movie" title={details.title} posterPath={details.poster_path} />
            </div>

            <WhereToWatch kind="movie" id={details.id} title={details.title} />
          </div>
        </div>
      </section>

      {/* Player */}
      <section className="md-player-section">
        <Player
          key={details.id}
          sources={streamSources}
          title={`Stream ${details.title}`}
          tmdbId={details.id}
          mediaType="movie"
          posterPath={details.poster_path}
        />
      </section>

      {/* Quick facts */}
      <section className="md-facts">
        {[
          { icon: 'clock', label: 'Runtime', value: formatRuntime(details.runtime) },
          { icon: 'dollarSign', label: 'Budget', value: details.budget ? `$${compactNumber(details.budget)}` : '—' },
          { icon: 'trendingUp', label: 'Revenue', value: details.revenue ? `$${compactNumber(details.revenue)}` : '—' },
          { icon: 'circle', label: 'Status', value: details.status || '—' },
        ].map((f) => (
          <div key={f.label} className="md-fact">
            <Icon name={f.icon} size={20} />
            <div className="md-fact-body">
              <span className="md-fact-label">{f.label}</span>
              <span className="md-fact-value">{f.value}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Cast */}
      {credits?.cast?.length > 0 && (
        <section className="md-section">
          <h2 className="md-section-title">Cast</h2>
          <CastList cast={credits.cast.slice(0, 12)} />
        </section>
      )}

      {/* Similar */}
      {similar.length > 0 && (
        <section className="md-section">
          <h2 className="md-section-title">You might also like</h2>
          <MediaRail>
            {similar.slice(0, 12).map((item) => (
              <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
            ))}
          </MediaRail>
        </section>
      )}

      {/* Trailers */}
      {videos.length > 0 && (
        <section className="md-section">
          <h2 className="md-section-title">Trailers & Clips</h2>
          <VideoRail videos={videos} />
        </section>
      )}
    </div>
  )
}
