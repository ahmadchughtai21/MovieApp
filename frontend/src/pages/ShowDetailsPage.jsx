import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { formatDate } from '../lib/format'
import Section from '../components/Section'
import MediaCard from '../components/MediaCard'
import MediaRail from '../components/MediaRail'
import CastList from '../components/CastList'
import VideoRail from '../components/VideoRail'
import Loading from '../components/Loading'
import ErrorState from '../components/ErrorState'

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
        console.log('Show details loaded:', data)
        if (active) {
          setState({ loading: false, error: null, data })
          setEpisodeData(data.episode_details)
        }
      })
      .catch((error) => {
        console.error('Show details error:', error)
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

  // Calculate meta before early returns to maintain hook order
  const details = state.data?.show_details
  const meta = useMemo(() => ([
    { label: 'First air', value: formatDate(details?.first_air_date) },
    { label: 'Status', value: details?.status || 'Unknown' },
    { label: 'Episodes', value: details?.number_of_episodes || 'Unknown' },
    { label: 'Seasons', value: details?.number_of_seasons || 'Unknown' }
  ]), [details])

  if (state.loading) return <Loading label="Loading show" />
  if (state.error) return <ErrorState message={state.error} />
  if (!state.data?.show_details) return <ErrorState message="No show data available" />

  const credits = state.data?.credits
  const videos = state.data?.videos?.results || []
  const similar = state.data?.similar_shows?.results || []
  const streamUrl = `https://vidsrc-embed.ru/embed/tv?tmdb=${details?.id}&season=${season}&episode=${episode}`
  const seasons = state.data?.seasons_data || []
  const nav = state.data?.navigation_info

  const backdrop = buildImageUrl(config, details?.backdrop_path, 'backdrop')
  const poster = buildImageUrl(config, details?.poster_path, 'poster')
  const episodeList = seasonData?.episodes || []

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
        <div className="details-backdrop" style={{ backgroundImage: `url(${backdrop})` }} />
        <div className="details-content">
          <div className="details-poster">
            {poster ? <img src={poster} alt={details?.name} /> : <div className="poster-fallback">No image</div>}
          </div>
          <div className="details-info">
            <h1>{details?.name}</h1>
            <p className="details-sub">
              {formatDate(details?.first_air_date)} · {details?.vote_average?.toFixed(1) || 'NR'} · {details?.vote_count || 0} votes
            </p>
            <p className="details-overview">{details?.overview}</p>
            <div className="details-genres">
              {(details?.genres || []).map((genre) => (
                <a key={genre.id} href={`/shows?genre=${genre.id}`} className="chip">{genre.name}</a>
              ))}
            </div>
            <div className="details-links">
              {details?.homepage && <a href={details.homepage} target="_blank" rel="noreferrer" className="btn ghost">Official site</a>}
              <a href={`https://www.themoviedb.org/tv/${details?.id}`} target="_blank" rel="noreferrer" className="btn ghost">TMDB page</a>
            </div>
          </div>
        </div>
      </section>

      <Section title="Stream" subtitle="Player loaded by default">
        {streamUrl ? (
          <div className="player">
            <iframe title={details?.name} src={streamUrl} allowFullScreen />
          </div>
        ) : (
          <div className="state">No streaming URL available.</div>
        )}
      </Section>

      <Section title="Season and episode" subtitle="Navigate through the series">
        <div className="season-picker">
          <label>
            Season
            <select value={season} onChange={handleSeasonChange}>
              {seasons.map((item) => (
                <option key={item.season_number} value={item.season_number}>
                  {item.name || `Season ${item.season_number}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Episode
            <select value={episode} onChange={handleEpisodeChange}>
              {episodeList.map((item) => (
                <option key={item.episode_number} value={item.episode_number}>
                  {item.episode_number}. {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="nav-episodes">
            <button 
              className="btn ghost" 
              disabled={!nav?.prev_episode} 
              onClick={() => {
                if (!nav?.prev_episode) return
                setSeason(nav.prev_episode.season)
                setEpisode(nav.prev_episode.episode)
              }}
              title="Go to previous episode"
            >
              ← Previous
            </button>
            <button 
              className="btn ghost" 
              disabled={!nav?.next_episode} 
              onClick={() => {
                if (!nav?.next_episode) return
                setSeason(nav.next_episode.season)
                setEpisode(nav.next_episode.episode)
              }}
              title="Go to next episode"
            >
              Next →
            </button>
          </div>
        </div>
        {episodeData && (
          <div className="episode-card">
            <div className="episode-title">Episode {episodeData.episode_number}: {episodeData.name}</div>
            <div className="episode-meta">
              <span>{formatDate(episodeData.air_date)}</span>
              <span>★ {episodeData.vote_average || 'NR'}</span>
            </div>
            <p>{episodeData.overview || 'No overview available.'}</p>
          </div>
        )}
      </Section>

      <Section title="Show stats" subtitle="Key details">
        <div className="stat-grid">
          {meta.map((stat) => (
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

      <Section title="Recommended" subtitle="Similar series">
        <MediaRail>
          {similar.slice(0, 12).map((item) => (
            <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
          ))}
        </MediaRail>
      </Section>

      <Section title="Trailers and clips" subtitle="From TMDB videos">
        <VideoRail videos={videos} />
      </Section>
    </div>
  )
}
