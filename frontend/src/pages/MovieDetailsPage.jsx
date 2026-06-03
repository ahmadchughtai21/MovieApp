import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { formatDate, formatRuntime, compactNumber } from '../lib/format'
import Section from '../components/Section'
import MediaCard from '../components/MediaCard'
import MediaRail from '../components/MediaRail'
import CastList from '../components/CastList'
import VideoRail from '../components/VideoRail'
import Icon from '../components/Icon'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import Player from '../components/Player'

export default function MovieDetailsPage() {
  const { id } = useParams()
  const config = useImageConfig()
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    let active = true
    setState({ loading: true, error: null, data: null })
    api.movieDetails(id)
      .then((data) => {
        if (active) setState({ loading: false, error: null, data })
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error.message, data: null })
      })

    return () => {
      active = false
    }
  }, [id])

  const details = state.data?.movie_details
  useDocumentTitle(details?.title)

  const stats = useMemo(() => ([
    { label: 'Runtime', value: formatRuntime(details?.runtime) },
    { label: 'Budget', value: details?.budget ? `$${compactNumber(details.budget)}` : 'Unknown' },
    { label: 'Revenue', value: details?.revenue ? `$${compactNumber(details.revenue)}` : 'Unknown' },
    { label: 'Status', value: details?.status || 'Unknown' }
  ]), [details])

  if (state.loading) return <Loading label="Loading movie" />
  if (state.error) return <ErrorState message={state.error} />
  if (!details) return <ErrorState message="No movie data available" />

  const credits = state.data?.credits
  const videos = state.data?.videos?.results || []
  const similar = state.data?.similar_movies?.results || []
  const streamUrl = `https://vidsrc-embed.ru/embed/movie/${details.id}`

  const backdrop = buildImageUrl(config, details.backdrop_path, 'backdrop')
  const poster = buildImageUrl(config, details.poster_path, 'poster')
  const releaseYear = details.release_date ? new Date(details.release_date).getFullYear() : null
  const rating = details.vote_average ? details.vote_average.toFixed(1) : null

  return (
    <div className="page details">
      <section className="details-hero">
        {backdrop ? (
          <div className="details-backdrop" style={{ backgroundImage: `url(${backdrop})` }} />
        ) : (
          <div className="details-backdrop" style={{ background: 'linear-gradient(135deg, #1c1c1f, #09090b)' }} />
        )}
        <div className="details-overlay" />

        <div className="details-content">
          <div className="details-poster">
            {poster ? <img src={poster} alt={details.title} /> : <div className="poster-fallback">No image</div>}
          </div>
          <div className="details-info">
            <span className="details-eyebrow">Movie</span>
            <h1>{details.title}</h1>

            {details.tagline ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.95rem' }}>
                {details.tagline}
              </p>
            ) : null}

            <div className="details-meta">
              {releaseYear ? <span>{releaseYear}</span> : null}
              {releaseYear && rating ? <span className="dot" /> : null}
              {rating ? (
                <span className="details-rating">
                  <Icon name="star" size={14} />
                  {rating}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                    ({details.vote_count || 0})
                  </span>
                </span>
              ) : null}
              {details.runtime ? (
                <>
                  <span className="dot" />
                  <span>{formatRuntime(details.runtime)}</span>
                </>
              ) : null}
            </div>

            {details.overview ? <p className="details-overview">{details.overview}</p> : null}

            {details.genres?.length ? (
              <div className="details-genres">
                {details.genres.map((genre) => (
                  <a key={genre.id} href={`/movies?genre=${genre.id}`} className="chip">
                    {genre.name}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <Section title="Stream" subtitle="Click fullscreen to watch distraction-free">
        <Player src={streamUrl} title={`Stream ${details.title}`} />
      </Section>

      <Section title="Overview" subtitle="Key facts at a glance">
        <div className="stat-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Cast" subtitle="The people on screen">
        <CastList cast={credits?.cast?.slice(0, 12) || []} />
      </Section>

      <Section title="You might also like" subtitle="Similar picks from TMDB">
        {similar.length > 0 ? (
          <MediaRail>
            {similar.slice(0, 12).map((item) => (
              <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
            ))}
          </MediaRail>
        ) : (
          <div className="state">
            <p>No similar movies found.</p>
          </div>
        )}
      </Section>

      <Section title="Trailers and clips" subtitle="From TMDB">
        <VideoRail videos={videos} />
      </Section>
    </div>
  )
}
