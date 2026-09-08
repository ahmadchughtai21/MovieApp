import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { formatDate } from '../lib/format'
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
      .catch((error) => { if (active) setState({ loading: false, error: error.message, data: null }) })
    return () => { active = false }
  }, [id, season, episode])

  useEffect(() => {
    api.seasonDetails(id, season).then(setSeasonData).catch(() => setSeasonData(null))
  }, [id, season])

  useEffect(() => {
    api.episodeDetails(id, season, episode).then(setEpisodeData).catch(() => {})
  }, [id, season, episode])

  const details = state.data?.show_details
  useDocumentTitle(details?.name)

  const streamSources = useMemo(
    () => buildStreamSources({ id: details?.id, season, episode }),
    [details?.id, season, episode]
  )

  if (state.loading) return <Loading label="Loading show" />
  if (state.error) return <ErrorState message={state.error} />
  if (!details) return <ErrorState message="No show data available" />

  const credits = state.data?.credits
  const videos = state.data?.videos?.results || []
  const similar = state.data?.similar_shows?.results || []
  const seasons = state.data?.seasons_data || []
  const nav = state.data?.navigation_info

  const backdrop = buildImageUrl(config, details.backdrop_path, 'backdrop', 'original')
  const poster = buildImageUrl(config, details.poster_path, 'poster', 'w500')
  const episodeList = seasonData?.episodes || []
  const firstYear = details.first_air_date ? new Date(details.first_air_date).getFullYear() : null
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
              {poster ? <img src={poster} alt={details.name} /> : <div className="md-poster-fallback">No image</div>}
            </div>
          </div>

          <div className="md-info">
            <span className="md-type">TV Series</span>
            <h1 className="md-title">{details.name}</h1>
            {details.tagline && <p className="md-tagline">{details.tagline}</p>}

            <div className="md-meta">
              {firstYear && <span className="md-meta-item">{firstYear}</span>}
              {rating && (
                <span className="md-meta-item md-rating">
                  <Icon name="star" size={16} /> {rating}
                </span>
              )}
              {details.number_of_seasons && (
                <span className="md-meta-item">{details.number_of_seasons} season{details.number_of_seasons !== 1 ? 's' : ''}</span>
              )}
              {details.vote_count > 0 && <span className="md-meta-item">{details.vote_count} votes</span>}
            </div>

            {details.overview && <p className="md-overview">{details.overview}</p>}

            {details.genres?.length > 0 && (
              <div className="md-genres">
                {details.genres.map((g) => (
                  <Link key={g.id} to={`/shows?genre=${g.id}`} className="md-chip">{g.name}</Link>
                ))}
              </div>
            )}

            <div className="md-actions">
              <WatchlistButton tmdbId={details.id} mediaType="tv" title={details.name} posterPath={details.poster_path} />
            </div>

            <WhereToWatch kind="show" id={details.id} title={details.name} />
          </div>
        </div>
      </section>

      {/* Player */}
      <section className="md-player-section">
        <Player
          key={`${details.id}-${season}-${episode}`}
          sources={streamSources}
          title={`Stream ${details.name}`}
          tmdbId={details.id}
          mediaType="tv"
          season={season}
          episode={episode}
          posterPath={details.poster_path}
        />
      </section>

      {/* Episode picker */}
      <section className="md-section">
        <h2 className="md-section-title">Season & Episode</h2>
        <div className="md-ep-picker">
          <div className="md-ep-field">
            <label htmlFor="season-select">Season</label>
            <select id="season-select" value={season} onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1) }}>
              {seasons.map((s) => (
                <option key={s.season_number} value={s.season_number}>{s.name || `Season ${s.season_number}`}</option>
              ))}
            </select>
          </div>
          <div className="md-ep-field">
            <label htmlFor="episode-select">Episode</label>
            <select id="episode-select" value={episode} onChange={(e) => setEpisode(Number(e.target.value))}>
              {episodeList.map((e) => (
                <option key={e.episode_number} value={e.episode_number}>{e.episode_number}. {e.name}</option>
              ))}
            </select>
          </div>
          <div className="md-ep-nav">
            <button className="md-ep-btn" disabled={!nav?.prev_episode}
              onClick={() => { if (nav?.prev_episode) { setSeason(nav.prev_episode.season); setEpisode(nav.prev_episode.episode) } }}>
              <Icon name="arrowLeft" size={14} /> Prev
            </button>
            <button className="md-ep-btn" disabled={!nav?.next_episode}
              onClick={() => { if (nav?.next_episode) { setSeason(nav.next_episode.season); setEpisode(nav.next_episode.episode) } }}>
              Next <Icon name="arrowRight" size={14} />
            </button>
          </div>
        </div>

        {episodeData && (
          <div className="md-ep-card">
            <div className="md-ep-card-head">
              <span className="md-ep-card-title">Episode {episodeData.episode_number}: {episodeData.name}</span>
              {episodeData.vote_average && (
                <span className="md-rating" style={{ fontSize: '0.82rem' }}>
                  <Icon name="star" size={12} /> {episodeData.vote_average.toFixed(1)}
                </span>
              )}
            </div>
            <div className="md-ep-card-meta">
              <span><Icon name="calendar" size={12} /> {formatDate(episodeData.air_date)}</span>
              {episodeData.runtime && <span><Icon name="clock" size={12} /> {episodeData.runtime}m</span>}
            </div>
            <p className="md-ep-card-desc">{episodeData.overview || 'No overview available.'}</p>
          </div>
        )}
      </section>

      {/* Quick facts */}
      <section className="md-facts">
        {[
          { icon: 'calendar', label: 'First Aired', value: formatDate(details.first_air_date) },
          { icon: 'circle', label: 'Status', value: details.status || '—' },
          { icon: 'film', label: 'Episodes', value: details.number_of_episodes || '—' },
          { icon: 'tv', label: 'Seasons', value: details.number_of_seasons || '—' },
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
              <MediaCard key={item.id} item={item} kind="show" to={`/shows/${item.id}`} />
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
