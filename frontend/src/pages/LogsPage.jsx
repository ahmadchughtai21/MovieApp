import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import StarRating from '../components/StarRating'
import Loading from '../components/Loading'
import PageBanner from '../components/PageBanner'

export default function LogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [movieDetails, setMovieDetails] = useState({})

  useEffect(() => {
    setLoading(true)
    const type = filter === 'all' ? undefined : filter
    api.logList(type)
      .then((data) => {
        setLogs(data)
        data.forEach((log) => {
          if (!movieDetails[log.tmdb_id]) {
            const endpoint = log.media_type === 'tv'
              ? api.showDetails(log.tmdb_id)
              : api.movieDetails(log.tmdb_id)
            endpoint
              .then((details) => {
                const d = log.media_type === 'tv' ? details.show_details : details.movie_details
                if (d) {
                  setMovieDetails((prev) => ({ ...prev, [log.tmdb_id]: d }))
                }
              })
              .catch(() => {})
          }
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter])

  const groupedLogs = logs.reduce((acc, log) => {
    const date = log.watched_date || 'Unknown date'
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {})

  const backdrops = Object.values(movieDetails)
    .map((d) => d.backdrop_path)
    .filter(Boolean)
    .slice(0, 3)

  if (loading) return <div className="page"><Loading /></div>

  return (
    <div className="page diary-page">
      <PageBanner
        title="Your Diary"
        subtitle={user ? `${user.username} · ${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}` : 'Log what you watch'}
        eyebrow="Journal"
        backdropPaths={backdrops}
      />

      <div className="diary-filters">
        {['all', 'movie', 'tv'].map((t) => (
          <button
            key={t}
            className={`diary-filter ${filter === t ? 'diary-filter--active' : ''}`}
            onClick={() => setFilter(t)}
          >
            {t === 'all' ? 'All' : t === 'movie' ? 'Movies' : 'TV Shows'}
          </button>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className="state">
          <div className="state-title">No entries yet</div>
          <p className="error-state">Log a film or show and it will show up in your diary.</p>
          <Link to="/discover" className="btn btn--accent">Discover something to watch</Link>
        </div>
      ) : (
        <div className="diary-entries">
          {Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date} className="diary-date-group">
              <h3 className="diary-date">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>

              <div className="diary-date-entries">
                {dateLogs.map((log) => {
                  const details = movieDetails[log.tmdb_id]
                  const title = details?.title || details?.name || ''
                  const poster = details?.poster_path
                  const link = log.media_type === 'tv' ? `/show/${log.tmdb_id}` : `/movie/${log.tmdb_id}`

                  return (
                    <Link key={log.id} to={link} className="diary-entry">
                      <div className="diary-entry__poster">
                        {poster ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w342${poster}`}
                            alt={title}
                            loading="lazy"
                          />
                        ) : (
                          <div className="diary-entry__poster--placeholder">
                            {log.media_type === 'tv' ? '📺' : '🎬'}
                          </div>
                        )}
                      </div>

                      <div className="diary-entry__info">
                        <h4 className="diary-entry__title">
                          {title || <span className="skeleton skeleton-line short" />}
                        </h4>
                        <div className="diary-entry__meta">
                          <span className="diary-entry__type">
                            {log.media_type === 'tv' ? 'TV Show' : 'Movie'}
                          </span>
                          {log.rating != null && (
                            <StarRating value={Number(log.rating)} readonly size="sm" />
                          )}
                          {(log.like_count || 0) > 0 && (
                            <span className="like-count">
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                              </svg>
                              <span>{log.like_count}</span>
                            </span>
                          )}
                        </div>
                        {log.review && (
                          <p className="diary-entry__review">{log.review}</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
