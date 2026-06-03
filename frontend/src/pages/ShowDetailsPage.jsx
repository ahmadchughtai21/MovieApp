import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { formatDate } from '../lib/format'
import Section from '../components/Section'
import MediaCard from '../components/MediaCard'
import MediaRail from '../components/MediaRail'
import CastList from '../components/CastList'
import VideoRail from '../components/VideoRail'
import Icon from '../components/Icon'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'
import Player from '../components/Player'

export default function ShowDetailsPage() {
  const { id } = useParams()
  const config = useImageConfig()
  const [season, setSeason] = useState(1)
  const [episode, setEpisode] = useState(1)
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [seasonData, setSeasonData] = useState(null)
  const [episodeData, setEpisodeData] = useState(null)

  useEffect(() => {
    let active = true
    setState({ loading: true, error: null, data: null })
    api.showDetails(id, season, episode)
      .then((data) => {
        if (active) {
          setState({ loading: false, error: null, data })
          setEpisodeData(data.episode_details)
        }
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error.message, data: null })
      })

    return () => {
      active = false
    }
  }, [id, season, episode])

  useEffect(() => {
    api.seasonDetails(id, season)
      .then((data) => setSeasonData(data))
      .catch(() => setSeasonData(null))
  }, [id, season])

  useEffect(() => {
    api.episodeDetails(id, season, episode)
      .then((data) => setEpisodeData(data))
      .catch(() => {})
  }, [id, season, episode])

  const details = state.data?.show_details
  useDocumentTitle(details?.name)

  const meta = useMemo(() => ([
    { label: 'First aired', value: formatDate(details?.first_air_date) },
    { label: 'Status', value: details?.status || 'Unknown' },
    { label: 'Episodes', value: details?.number_of_episodes || 'Unknown' },
    { label: 'Seasons', value: details?.number_of_seasons || 'Unknown' }
  ]), [details])

  if (state.loading) return <Loading label="Loading show" />
  if (state.error) return <ErrorState message={state.error} />
  if (!details) return <ErrorState message="No show data available" />

  const credits = state.data?.credits
  const videos = state.data?.videos?.results || []
  const similar = state.data?.similar_shows?.results || []
  const streamUrl = `https://vidsrc-embed.ru/embed/tv?tmdb=${details.id}&season=${season}&episode=${episode}`
  const seasons = state.data?.seasons_data || []
  const nav = state.data?.navigation_info

  const backdrop = buildImageUrl(config, details.backdrop_path, 'backdrop')
  const poster = buildImageUrl(config, details.poster_path, 'poster')
  const episodeList = seasonData?.episodes || []
  const firstYear = details.first_air_date ? new Date(details.first_air_date).getFullYear() : null
  const rating = details.vote_average ? details.vote_average.toFixed(1) : null

  function handleSeasonChange(event) {
    setSeason(Number(event.target.value))
    setEpisode(1)
  }

  function handleEpisodeChange(event) {
    setEpisode(Number(event.target.value))
  }

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
            {poster ? <img src={poster} alt={details.name} /> : <div className="poster-fallback">No image</div>}
          </div>
          <div className="details-info">
            <span className="details-eyebrow">TV Series</span>
            <h1>{details.name}</h1>

            {details.tagline ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.95rem' }}>
                {details.tagline}
              </p>
            ) : null}

            <div className="details-meta">
              {firstYear ? <span>{firstYear}</span> : null}
              {firstYear && rating ? <span className="dot" /> : null}
              {rating ? (
                <span className="details-rating">
                  <Icon name="star" size={14} />
                  {rating}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                    ({details.vote_count || 0})
                  </span>
                </span>
              ) : null}
              {details.number_of_seasons ? (
                <>
                  <span className="dot" />
                  <span>{details.number_of_seasons} season{details.number_of_seasons !== 1 ? 's' : ''}</span>
                </>
              ) : null}
            </div>

            {details.overview ? <p className="details-overview">{details.overview}</p> : null}

            {details.genres?.length ? (
              <div className="details-genres">
                {details.genres.map((genre) => (
                  <a key={genre.id} href={`/shows?genre=${genre.id}`} className="chip">
                    {genre.name}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <Section title="Stream" subtitle="Click fullscreen to watch distraction-free">
        <Player src={streamUrl} title={`Stream ${details.name}`} />
      </Section>

      <Section title="Season and episode" subtitle="Navigate the series">
        <div className="episode-picker">
          <div className="episode-field">
            <label htmlFor="season-select">Season</label>
            <select id="season-select" value={season} onChange={handleSeasonChange}>
              {seasons.map((item) => (
                <option key={item.season_number} value={item.season_number}>
                  {item.name || `Season ${item.season_number}`}
                </option>
              ))}
            </select>
          </div>
          <div className="episode-field">
            <label htmlFor="episode-select">Episode</label>
            <select id="episode-select" value={episode} onChange={handleEpisodeChange}>
              {episodeList.map((item) => (
                <option key={item.episode_number} value={item.episode_number}>
                  {item.episode_number}. {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="episode-nav">
            <button
              className="btn btn-outline"
              disabled={!nav?.prev_episode}
              onClick={() => {
                if (!nav?.prev_episode) return
                setSeason(nav.prev_episode.season)
                setEpisode(nav.prev_episode.episode)
              }}
              aria-label="Previous episode"
            >
              <Icon name="arrowLeft" size={14} />
              Prev
            </button>
            <button
              className="btn btn-outline"
              disabled={!nav?.next_episode}
              onClick={() => {
                if (!nav?.next_episode) return
                setSeason(nav.next_episode.season)
                setEpisode(nav.next_episode.episode)
              }}
              aria-label="Next episode"
            >
              Next
              <Icon name="arrowRight" size={14} />
            </button>
          </div>
        </div>
        {episodeData ? (
          <div className="episode-card">
            <div className="episode-card-head">
              <div className="episode-title">
                Episode {episodeData.episode_number}: {episodeData.name}
              </div>
              {episodeData.vote_average ? (
                <span className="details-rating" style={{ fontSize: '0.85rem' }}>
                  <Icon name="star" size={12} />
                  {episodeData.vote_average.toFixed(1)}
                </span>
              ) : null}
            </div>
            <div className="episode-meta">
              <span><Icon name="calendar" size={12} /> {formatDate(episodeData.air_date)}</span>
              {episodeData.runtime ? <span><Icon name="clock" size={12} /> {episodeData.runtime}m</span> : null}
            </div>
            <p>{episodeData.overview || 'No overview available.'}</p>
          </div>
        ) : null}
      </Section>

      <Section title="Show info" subtitle="Key details">
        <div className="stat-grid">
          {meta.map((stat) => (
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

      <Section title="Recommended" subtitle="Similar series from TMDB">
        {similar.length > 0 ? (
          <MediaRail>
            {similar.slice(0, 12).map((item) => (
              <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
            ))}
          </MediaRail>
        ) : (
          <div className="state">
            <p>No similar shows found.</p>
          </div>
        )}
      </Section>

      <Section title="Trailers and clips" subtitle="From TMDB">
        <VideoRail videos={videos} />
      </Section>
    </div>
  )
}
