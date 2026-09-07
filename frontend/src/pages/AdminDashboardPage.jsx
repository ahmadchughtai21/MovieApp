import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import Icon from '../components/Icon'
import Loading from '../components/Loading'

function StatCard({ label, value, icon, accent, sub }) {
  return (
    <div className="admin-stat-card">
      <div className={`admin-stat-icon${accent ? ' accent' : ''}`}>
        <Icon name={icon} size={20} />
      </div>
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  )
}

function formatTimeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(ts).toLocaleDateString()
}

function formatDuration(seconds) {
  if (!seconds) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const ACTION_LABELS = {
  login: 'Login',
  logout: 'Logout',
  register: 'Register',
  watch: 'Watched',
  watchlist_add: 'Added to Watchlist',
  watchlist_remove: 'Removed from Watchlist',
  search: 'Search',
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [users, setUsers] = useState([])
  const [topContent, setTopContent] = useState([])
  const [liveSessions, setLiveSessions] = useState([])
  const [searchStats, setSearchStats] = useState(null)
  const [recentSearches, setRecentSearches] = useState([])
  const [bannedIps, setBannedIps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('overview')
  const [banModal, setBanModal] = useState(null)
  const [banReason, setBanReason] = useState('')
  const [banning, setBanning] = useState(false)
  const intervalRef = useRef(null)

  const fetchAll = useCallback(async () => {
    try {
      const [s, a, u, t, l, ss, rs, bi] = await Promise.all([
        api.adminStats(),
        api.adminActivity(),
        api.adminUsers(),
        api.adminTopContent(),
        api.adminLiveSessions(),
        api.adminSearchStats(),
        api.adminSearches(),
        api.adminBannedIps(),
      ])
      setStats(s)
      setActivity(a)
      setUsers(u)
      setTopContent(t)
      setLiveSessions(l)
      setSearchStats(ss)
      setRecentSearches(rs)
      setBannedIps(bi)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user || !user.is_admin) return
    fetchAll()
    intervalRef.current = setInterval(fetchAll, 10000)
    return () => clearInterval(intervalRef.current)
  }, [user, fetchAll])

  const handleBan = async () => {
    if (!banModal || !banModal.ip) return
    setBanning(true)
    try {
      await api.adminBanIp(banModal.ip, banReason)
      setBanModal(null)
      setBanReason('')
      fetchAll()
    } catch (err) {
      alert(err.message)
    } finally {
      setBanning(false)
    }
  }

  const handleUnban = async (banId) => {
    try {
      await api.adminUnbanIp(banId)
      fetchAll()
    } catch (err) {
      alert(err.message)
    }
  }

  if (!user || !user.is_admin) {
    return (
      <div className="admin-page">
        <div className="admin-denied">
          <Icon name="lock" size={48} />
          <h2>Access Denied</h2>
          <p>Admin privileges required.</p>
          <Link to="/" className="btn btn-accent" style={{ marginTop: '16px' }}>Go Home</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="admin-page">
        <Loading label="Loading dashboard" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-denied">
          <Icon name="alertTriangle" size={48} />
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button className="btn btn-accent" style={{ marginTop: '16px' }} onClick={fetchAll}>Retry</button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'users', label: 'Users' },
    { id: 'content', label: 'Top Content' },
    { id: 'live', label: 'Live Sessions' },
    { id: 'searches', label: 'Searches' },
    { id: 'banned', label: 'Banned IPs', count: bannedIps.length },
  ]

  const bannedSet = new Set(bannedIps.map(b => b.ip_address))

  const BanButton = ({ ip }) => {
    if (!ip || bannedSet.has(ip)) return null
    return (
      <button
        type="button"
        className="admin-ban-btn"
        onClick={() => setBanModal({ ip })}
        title="Ban this IP"
      >
        <Icon name="shieldOff" size={13} />
        Ban
      </button>
    )
  }

  const UnbanButton = ({ banId }) => (
    <button
      type="button"
      className="admin-unban-btn"
      onClick={() => handleUnban(banId)}
      title="Unban this IP"
    >
      <Icon name="shieldCheck" size={13} />
      Unban
    </button>
  )

  return (
    <div className="admin-page">
      {banModal && (
        <div className="admin-modal-backdrop" onClick={() => { setBanModal(null); setBanReason('') }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>Ban IP Address</h3>
            <p className="admin-modal-ip">{banModal.ip}</p>
            <input
              type="text"
              className="admin-modal-input"
              placeholder="Reason (optional)"
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleBan() }}
            />
            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={() => { setBanModal(null); setBanReason('') }}>Cancel</button>
              <button className="btn btn-danger" onClick={handleBan} disabled={banning}>
                {banning ? 'Banning...' : 'Ban IP'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="admin-header">
        <div className="admin-header-left">
          <h1>Admin Dashboard</h1>
          <span className="admin-live-dot" />
          <span className="admin-auto-text">Live — auto-refreshes every 10s</span>
        </div>
        <Link to="/" className="btn btn-ghost admin-back-btn">
          <Icon name="arrowLeft" size={16} />
          Back to Madflix
        </Link>
      </header>

      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count != null && t.count > 0 && <span className="admin-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="admin-overview">
          <div className="admin-stat-grid">
            <StatCard label="Total Users" value={stats?.total_users ?? 0} icon="user" sub={`+${stats?.new_users_week ?? 0} this week`} />
            <StatCard label="Total Plays" value={stats?.total_plays ?? 0} icon="play" accent sub={`${stats?.plays_today ?? 0} today`} />
            <StatCard label="Watchlist Items" value={stats?.total_watchlist ?? 0} icon="heart" />
            <StatCard label="Watch Time" value={formatDuration(stats?.total_watch_time_seconds ?? 0)} icon="clock" accent sub={`avg ${formatDuration(stats?.avg_session_seconds ?? 0)} / session`} />
            <StatCard label="Active (7d)" value={stats?.active_users_7d ?? 0} icon="user" sub={`${stats?.new_users_today ?? 0} new today`} />
            <StatCard label="Unique Content" value={stats?.unique_content ?? 0} icon="film" accent sub={`${stats?.plays_this_week ?? 0} plays this week`} />
          </div>

          {stats?.daily_plays?.length > 0 && (
            <div className="admin-panel" style={{ margin: '0 32px 20px' }}>
              <h3 className="admin-panel-title">Plays (Last 7 Days)</h3>
              <div className="admin-chart">
                {stats.daily_plays.map((day, i) => {
                  const max = Math.max(...stats.daily_plays.map(d => d.count), 1)
                  const pct = (day.count / max) * 100
                  return (
                    <div key={i} className="admin-chart-bar-wrap">
                      <div className="admin-chart-bar" style={{ height: `${Math.max(pct, 4)}%` }} />
                      <span className="admin-chart-label">{day.count}</span>
                      <span className="admin-chart-day">{new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="admin-grid-2col">
            <div className="admin-panel">
              <h3 className="admin-panel-title">Recent Activity</h3>
              <div className="admin-activity-list">
                {activity.slice(0, 10).map((item, i) => (
                  <div key={i} className="admin-activity-item">
                    <span className={`admin-activity-badge ${item.action}`}>{ACTION_LABELS[item.action] || item.action}</span>
                    <span className="admin-activity-user">{item.username}</span>
                    <span className="admin-activity-detail">
                      {item.detail || item.title || `#${item.tmdb_id || ''}`}
                    </span>
                    <span className="admin-activity-meta">
                      {item.ip_address && <><span className="admin-ip-text">{item.ip_address}</span><BanButton ip={item.ip_address} /> · </>}
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                ))}
                {activity.length === 0 && <p className="admin-empty">No activity yet</p>}
              </div>
            </div>

            <div className="admin-panel">
              <h3 className="admin-panel-title">Live Sessions</h3>
              <div className="admin-activity-list">
                {liveSessions.map((s, i) => (
                  <div key={i} className="admin-activity-item">
                    <span className="admin-activity-badge live">LIVE</span>
                    <span className="admin-activity-user">{s.username}</span>
                    <span className="admin-activity-detail">
                      {s.title || `#${s.tmdb_id}`}
                      {s.progress_pct > 0 && ` · ${s.progress_pct}%`}
                    </span>
                    <span className="admin-activity-meta">
                      {s.device} · <span className="admin-ip-text">{s.ip_address}</span>
                      <BanButton ip={s.ip_address} />
                    </span>
                  </div>
                ))}
                {liveSessions.length === 0 && <p className="admin-empty">No active sessions</p>}
              </div>
            </div>
          </div>

          {stats?.devices && Object.keys(stats.devices).length > 0 && (
            <div className="admin-panel" style={{ margin: '0 32px' }}>
              <h3 className="admin-panel-title">Devices (Last 30 Days)</h3>
              <div className="admin-devices">
                {Object.entries(stats.devices)
                  .sort((a, b) => b[1] - a[1])
                  .map(([device, count]) => (
                    <div key={device} className="admin-device-chip">
                      <span className="admin-device-name">{device}</span>
                      <span className="admin-device-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="admin-panel full">
          <h3 className="admin-panel-title">All Activity</h3>
          <div className="admin-activity-list">
            {activity.map((item, i) => (
              <div key={i} className="admin-activity-item">
                <span className={`admin-activity-badge ${item.action}`}>{ACTION_LABELS[item.action] || item.action}</span>
                <span className="admin-activity-user">{item.username}</span>
                <span className="admin-activity-detail">
                  {item.detail || item.title || `#${item.tmdb_id || ''}`}
                </span>
                <span className="admin-activity-meta">
                  {item.ip_address && <><span className="admin-ip-text">{item.ip_address}</span><BanButton ip={item.ip_address} /> · </>}
                  {formatTimeAgo(item.timestamp)}
                </span>
              </div>
            ))}
            {activity.length === 0 && <p className="admin-empty">No activity yet</p>}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="admin-panel full">
          <h3 className="admin-panel-title">Registered Users</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Last Active</th>
                  <th>Plays</th>
                  <th>Watchlist</th>
                  <th>Watch Time</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i}>
                    <td className="admin-table-user">{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`admin-role-badge${u.is_staff ? ' staff' : ''}`}>
                        {u.is_staff ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td>{u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '-'}</td>
                    <td>{u.last_active ? formatTimeAgo(u.last_active) : 'Never'}</td>
                    <td>{u.play_count ?? 0}</td>
                    <td>{u.watchlist_count ?? 0}</td>
                    <td>{formatDuration(u.total_watch_seconds ?? 0)}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="8" className="admin-empty">No users</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'content' && (
        <div className="admin-panel full">
          <h3 className="admin-panel-title">Most Watched Content</h3>
          <div className="admin-content-grid">
            {[...(topContent.movies || []), ...(topContent.shows || [])]
              .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
              .map((item, i) => (
                <div key={`${item.tmdb_id}-${item.season}-${item.episode}-${i}`} className="admin-content-card">
                  <div className="admin-content-rank">#{i + 1}</div>
                  <div className="admin-content-info">
                    <div className="admin-content-title">
                      {item.title || `TMDB #${item.tmdb_id}`}
                      {item.season && item.episode && <span className="admin-content-ep"> S{item.season}E{item.episode}</span>}
                    </div>
                    <div className="admin-content-meta">
                      <span className="admin-content-type">{item.media_type === 'tv' ? 'TV' : 'Movie'}</span>
                      <span className="admin-content-count">{item.play_count} plays</span>
                      <span className="admin-content-users">{item.unique_viewers} viewers</span>
                      {item.total_time > 0 && <span>{formatDuration(item.total_time)} total</span>}
                    </div>
                  </div>
                </div>
              ))}
            {(!topContent.movies?.length && !topContent.shows?.length) && <p className="admin-empty">No content data yet</p>}
          </div>
        </div>
      )}

      {tab === 'live' && (
        <div className="admin-panel full">
          <h3 className="admin-panel-title">Active Sessions</h3>
          <div className="admin-activity-list">
            {liveSessions.map((s, i) => (
              <div key={i} className="admin-activity-item">
                <span className="admin-activity-badge live">LIVE</span>
                <span className="admin-activity-user">{s.username}</span>
                <span className="admin-activity-detail">
                  {s.title || `#${s.tmdb_id}`}
                  {s.season && s.episode && ` · S${s.season}E${s.episode}`}
                </span>
                <span className="admin-activity-meta">
                  {s.progress_pct}% · {formatDuration(s.position_seconds)} / {formatDuration(s.duration_seconds)} · {s.device} · <span className="admin-ip-text">{s.ip_address}</span>
                  <BanButton ip={s.ip_address} />
                </span>
              </div>
            ))}
            {liveSessions.length === 0 && <p className="admin-empty">No active sessions</p>}
          </div>
        </div>
      )}

      {tab === 'searches' && (
        <div className="admin-grid-2col" style={{ padding: '24px 32px' }}>
          <div className="admin-panel">
            <h3 className="admin-panel-title">Search Stats</h3>
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>{searchStats?.searches_today ?? 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Searches Today</div>
            </div>
            <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '16px 0 8px' }}>Top Queries</h4>
            <div className="admin-activity-list">
              {(searchStats?.top_queries || []).map((q, i) => (
                <div key={i} className="admin-activity-item">
                  <span className="admin-activity-user" style={{ minWidth: 'auto' }}>#{i + 1}</span>
                  <span className="admin-activity-detail" style={{ fontWeight: 500 }}>"{q.query}"</span>
                  <span className="admin-activity-meta">{q.count} searches</span>
                </div>
              ))}
              {(!searchStats?.top_queries?.length) && <p className="admin-empty">No search data yet</p>}
            </div>
          </div>

          <div className="admin-panel">
            <h3 className="admin-panel-title">Recent Searches</h3>
            <div className="admin-activity-list">
              {recentSearches.map((s, i) => (
                <div key={i} className="admin-activity-item">
                  <span className="admin-activity-detail" style={{ fontWeight: 500 }}>"{s.query}"</span>
                  <span className="admin-activity-user">{s.username}</span>
                  <span className="admin-activity-meta">
                    {s.results_count} results
                    {s.ip_address && <> · <span className="admin-ip-text">{s.ip_address}</span><BanButton ip={s.ip_address} /></>}
                    · {formatTimeAgo(s.timestamp)}
                  </span>
                </div>
              ))}
              {recentSearches.length === 0 && <p className="admin-empty">No searches yet</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'banned' && (
        <div className="admin-panel full">
          <h3 className="admin-panel-title">Banned IP Addresses</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Reason</th>
                  <th>Banned By</th>
                  <th>Date</th>
                  <th style={{ width: '100px' }}></th>
                </tr>
              </thead>
              <tbody>
                {bannedIps.map((b) => (
                  <tr key={b.id}>
                    <td className="admin-table-user">{b.ip_address}</td>
                    <td>{b.reason || '—'}</td>
                    <td>{b.banned_by}</td>
                    <td>{new Date(b.created_at).toLocaleDateString()}</td>
                    <td>
                      <UnbanButton banId={b.id} />
                    </td>
                  </tr>
                ))}
                {bannedIps.length === 0 && (
                  <tr><td colSpan="5" className="admin-empty">No banned IPs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
