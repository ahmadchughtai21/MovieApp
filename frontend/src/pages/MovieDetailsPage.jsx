import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { formatDate, formatRuntime, compactNumber } from '../lib/format'
import Section from '../components/Section'
import MediaCard from '../components/MediaCard'
import MediaRail from '../components/MediaRail'
import CastList from '../components/CastList'
import VideoRail from '../components/VideoRail'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

export default function MovieDetailsPage() {
  const { id } = useParams()
  const config = useImageConfig()
  const [state, setState] = useState({ loading: true, error: null, data: null })

  useEffect(() => {
    let active = true
    setState({ loading: true, error: null, data: null })
    api.movieDetails(id)
      .then((data) => {
        console.log('Movie details loaded:', data)
        if (active) setState({ loading: false, error: null, data })
      })
      .catch((error) => {
        console.error('Movie details error:', error)
        if (active) setState({ loading: false, error: error.message, data: null })
      })

    return () => {
      active = false
    }
  }, [id])

  // Calculate stats before early returns to maintain hook order
  const details = state.data?.movie_details
  const stats = useMemo(() => ([
    { label: 'Runtime', value: formatRuntime(details?.runtime) },
    { label: 'Budget', value: details?.budget ? `$${compactNumber(details.budget)}` : 'Unknown' },
    { label: 'Revenue', value: details?.revenue ? `$${compactNumber(details.revenue)}` : 'Unknown' },
    { label: 'Status', value: details?.status || 'Unknown' }
  ]), [details])

  if (state.loading) return <Loading label="Loading movie" />
  if (state.error) return <ErrorState message={state.error} />
  if (!state.data?.movie_details) return <ErrorState message="No movie data available" />

  const credits = state.data?.credits
  const videos = state.data?.videos?.results || []
  const similar = state.data?.similar_movies?.results || []
  const streamUrl = `https://vidsrc-embed.ru/embed/movie/${details?.id}`

  console.log('Rendering with details:', details)
  console.log('Full state.data:', state.data)

  const backdrop = buildImageUrl(config, details?.backdrop_path, 'backdrop')
  const poster = buildImageUrl(config, details?.poster_path, 'poster')

  return (
    <div className="page details">
      <section className="details-hero">
        <div className="details-backdrop" style={{ backgroundImage: `url(${backdrop})` }} />
        <div className="details-content">
          <div className="details-poster">
            {poster ? <img src={poster} alt={details?.title} /> : <div className="poster-fallback">No image</div>}
          </div>
          <div className="details-info">
            <h1>{details?.title}</h1>
            <p className="details-sub">
              {formatDate(details?.release_date)} · {details?.vote_average?.toFixed(1) || 'NR'} · {details?.vote_count || 0} votes
            </p>
            <p className="details-overview">{details?.overview}</p>
            <div className="details-genres">
              {(details?.genres || []).map((genre) => (
                <a key={genre.id} href={`/movies?genre=${genre.id}`} className="chip">{genre.name}</a>
              ))}
            </div>
            <div className="details-links">
              {details?.homepage && <a href={details.homepage} target="_blank" rel="noreferrer" className="btn ghost">Official site</a>}
              <a href={`https://www.themoviedb.org/movie/${details?.id}`} target="_blank" rel="noreferrer" className="btn ghost">TMDB page</a>
            </div>
          </div>
        </div>
      </section>

      <Section title="Stream" subtitle="Player loaded by default">
        {streamUrl ? (
          <div className="player">
            <iframe title={details?.title} src={streamUrl} allowFullScreen />
          </div>
        ) : (
          <div className="state">No streaming URL available.</div>
        )}
      </Section>

      <Section title="Overview" subtitle="Key facts">
        <div className="stat-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Cast" subtitle="Click a name to explore more">
        <CastList cast={credits?.cast?.slice(0, 16) || []} />
      </Section>

      <Section title="Recommended" subtitle="Similar picks">
        <MediaRail>
          {similar.slice(0, 12).map((item) => (
            <MediaCard key={item.id} item={item} kind="movie" to={`/movies/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section title="Trailers and clips" subtitle="From TMDB videos">
        <VideoRail videos={videos} />
      </Section>
    </div>
  )
}
