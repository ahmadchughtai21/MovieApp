import { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { formatDate, compactNumber, formatLanguage } from '../lib/format'
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

export default function ShowDetailsPage() {
  const { id } = useParams()
  const config = useImageConfig()
  const [season, setSeason] = useState(1)
  const [episode, setEpisode] = useState(1)
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [seasonData, setSeasonData] = useState(null)
  const [episodeData, setEpisodeData] = useState(null)
  const [recs, setRecs] = useState([])
  const [logOpen, setLogOpen] = useState(false)
  const [logStats, setLogStats] = useState(null)
  const [myLog, setMyLog] = useState(null)
  const { user } = useAuth()

  const refreshMyLog = useCallback(() => {
    if (!user) { setMyLog(null); return }
    api.logForMovie(id, 'tv')
      .then((logs) => setMyLog(logs.find((l) => l.username === user.username && l.media_type === 'tv') || null))
      .catch(() => {})
  }, [id, user])

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

  useEffect(() => {
    let active = true
    api.showRecommendations(id)
      .then((data) => { if (active) setRecs(data.results || []) })
      .catch(() => {})
    return () => { active = false }
  }, [id])

  useEffect(() => {
    api.logStats(id).then(setLogStats).catch(() => {})
  }, [id])

  useEffect(() => { refreshMyLog() }, [refreshMyLog])

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
  const similar = recs.length > 0 ? recs : (state.data?.similar_shows?.results || [])
  const seasons = state.data?.seasons_data || []
  const nav = state.data?.navigation_info

  const backdrop = buildImageUrl(config, details.backdrop_path, 'backdrop', 'original')
  const poster = buildImageUrl(config, details.poster_path, 'poster', 'w500')
  const episodeList = seasonData?.episodes || []
  const firstYear = details.first_air_date ? new Date(details.first_air_date).getFullYear() : null
  const lastYear = details.last_air_date ? new Date(details.last_air_date).getFullYear() : null
  const rating = details.vote_average ? details.vote_average.toFixed(1) : null
  const yearRange = firstYear && lastYear && lastYear !== firstYear ? `${firstYear}–${lastYear}` : firstYear

  const facts = [
    { label: 'Status', value: details.status },
    { label: 'First air', value: details.first_air_date ? formatDate(details.first_air_date) : null },
    { label: 'Seasons', value: details.number_of_seasons ? `${details.number_of_seasons}` : null },
    { label: 'Episodes', value: details.number_of_episodes ? compactNumber(details.number_of_episodes) : null },
    { label: 'Language', value: formatLanguage(details.original_language) },
    { label: 'Network', value: details.networks?.[0]?.name },
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
              {poster ? <img src={poster} alt={details.name} /> : <div className="md-poster-fallback">No image</div>}
            </div>
          </div>

          <div className="md-info">
            <span className="md-type">TV Series</span>
            <h1 className="md-title">{details.name}</h1>
            {details.tagline && <p className="md-tagline">{details.tagline}</p>}

            <div className="md-meta">
              {yearRange && <span className="md-meta-item">{yearRange}</span>}
              {rating && (
                <span className="md-meta-item md-rating">
                  <Icon name="star" size={14} /> {rating}
                </span>
              )}
              {details.number_of_seasons && (
                <span className="md-meta-item">{details.number_of_seasons} season{details.number_of_seasons !== 1 ? 's' : ''}</span>
              )}
              {details.number_of_episodes && (
                <span className="md-meta-item">{compactNumber(details.number_of_episodes)} episodes</span>
              )}
              {details.vote_count > 0 && <span className="md-meta-item">{compactNumber(details.vote_count)} votes</span>}
            </div>

            {details.overview && <p className="md-overview">{details.overview}</p>}

            {details.genres?.length > 0 && (
              <div className="md-genres">
                {details.genres.map((g) => (
                  <Link key={g.id} to={`/discover?tab=tv&genre=${g.id}`} className="md-chip">{g.name}</Link>
                ))}
              </div>
            )}

            <div className="md-actions">
              <a href="#watch" className="btn btn--accent">
                <Icon name="play" size={15} />
                <span>Watch</span>
              </a>
              <WatchlistButton tmdbId={details.id} mediaType="tv" title={details.name} posterPath={details.poster_path} />
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

            <WhereToWatch kind="show" id={details.id} title={details.name} />
          </div>
        </div>
      </section>

      {logOpen && (
        <LogModal
          tmdbId={details.id}
          mediaType="tv"
          title={details.name}
          posterPath={details.poster_path}
          onClose={() => { setLogOpen(false); api.logStats(id).then(setLogStats).catch(() => {}); refreshMyLog() }}
        />
      )}

      <section className="md-player-section" id="watch">
        <div className="md-player-head">
          <h2 className="md-section-title">Watch Now</h2>
          <div className="md-ep-toolbar">
            <label className="md-ep-select">
              <span className="md-ep-select__label">Season</span>
              <select
                value={season}
                onChange={(e) => { setSeason(Number(e.target.value)); setEpisode(1) }}
                aria-label="Select season"
              >
                {seasons.map((s) => (
                  <option key={s.season_number} value={s.season_number}>
                    {s.name || `Season ${s.season_number}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="md-ep-select">
              <span className="md-ep-select__label">Episode</span>
              <select
                value={episode}
                onChange={(e) => setEpisode(Number(e.target.value))}
                aria-label="Select episode"
              >
                {episodeList.map((e) => (
                  <option key={e.episode_number} value={e.episode_number}>
                    {e.episode_number}. {e.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="md-ep-nav">
              <button
                type="button"
                className="md-ep-btn"
                disabled={!nav?.prev_episode}
                aria-label="Previous episode"
                onClick={() => { if (nav?.prev_episode) { setSeason(nav.prev_episode.season); setEpisode(nav.prev_episode.episode) } }}
              >
                <Icon name="arrowLeft" size={14} />
              </button>
              <button
                type="button"
                className="md-ep-btn"
                disabled={!nav?.next_episode}
                aria-label="Next episode"
                onClick={() => { if (nav?.next_episode) { setSeason(nav.next_episode.season); setEpisode(nav.next_episode.episode) } }}
              >
                <Icon name="arrowRight" size={14} />
              </button>
            </div>
          </div>
        </div>

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

        {episodeData && (
          <div className="md-ep-card">
            <div className="md-ep-card-head">
              <span className="md-ep-card-kicker">S{String(season).padStart(2, '0')} · E{String(episode).padStart(2, '0')}</span>
              <span className="md-ep-card-title">{episodeData.name}</span>
              {episodeData.vote_average > 0 && (
                <span className="md-rating md-ep-card-rating">
                  <Icon name="star" size={12} /> {episodeData.vote_average.toFixed(1)}
                </span>
              )}
            </div>
            <div className="md-ep-card-meta">
              {episodeData.air_date && (
                <span><Icon name="calendar" size={12} /> {formatDate(episodeData.air_date)}</span>
              )}
              {episodeData.runtime && (
                <span><Icon name="clock" size={12} /> {episodeData.runtime}m</span>
              )}
            </div>
            <p className="md-ep-card-desc">{episodeData.overview || 'No overview available.'}</p>
          </div>
        )}
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

      <MediaClips tmdbId={id} mediaType="tv" />

      <ReviewsSection tmdbId={id} mediaType="tv" />

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
              <MediaCard key={item.id} item={item} kind="show" to={`/show/${item.id}`} />
            ))}
          </MediaRail>
        </section>
      )}
    </div>
  )
}
