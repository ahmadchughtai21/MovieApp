import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import Icon from '../components/Icon'
import Loading from '../components/Loading'

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'activity', label: 'Activity', icon: 'clock' },
  { id: 'users', label: 'Users', icon: 'user' },
  { id: 'content', label: 'Content', icon: 'film' },
  { id: 'live', label: 'Live', icon: 'play' },
  { id: 'searches', label: 'Searches', icon: 'search' },
  { id: 'banned', label: 'Banned', icon: 'shieldOff' },
]

const ACTION_STYLES = {
  login: { bg: '#166534', color: '#4ade80' },
  logout: { bg: '#713f12', color: '#fbbf24' },
  register: { bg: '#1e3a5f', color: '#60a5fa' },
  watch: { bg: '#581c87', color: '#c084fc' },
  watchlist_add: { bg: '#7f1d1d', color: '#f87171' },
  watchlist_remove: { bg: '#3f3f46', color: '#a1a1aa' },
  search: { bg: '#1e3a5f', color: '#60a5fa' },
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

function Stat({ label, value, icon, color, sub }) {
  return (
    <div className="a-stat">
      <div className="a-stat-icon" style={{ background: color + '18', color }}>
        <Icon name={icon} size={18} />
      </div>
      <div className="a-stat-body">
        <div className="a-stat-value">{value}</div>
        <div className="a-stat-label">{label}</div>
        {sub && <div className="a-stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

function Badge({ children, style }) {
  return <span className="a-badge" style={style}>{children}</span>
}

function Panel({ title, children, action }) {
  return (
    <div className="a-panel">
      <div className="a-panel-head">
        <h3 className="a-panel-title">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function ActivityRow({ item, onBan, bannedSet }) {
  const s = ACTION_STYLES[item.action] || { bg: '#27272a', color: '#a1a1aa' }
  return (
    <div className="a-row">
      <Badge style={s}>{item.action.replace(/_/g, ' ')}</Badge>
      <span className="a-row-user">{item.username}</span>
      <span className="a-row-detail">{item.detail || item.title || `#${item.tmdb_id || ''}`}</span>
      <span className="a-row-meta">
        {item.ip_address && (
          <>
            <code className="a-ip">{item.ip_address}</code>
            {!bannedSet.has(item.ip_address) && (
              <button className="a-ban-link" onClick={() => onBan(item.ip_address)}>Ban</button>
            )}
          </>
        )}
        <span className="a-row-time">{formatTimeAgo(item.timestamp)}</span>
      </span>
    </div>
  )
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
    if (!banModal) return
    setBanning(true)
    try {
      await api.adminBanIp(banModal, banReason)
      setBanModal(null)
      setBanReason('')
      fetchAll()
    } catch (err) {
      alert(err.message)
    } finally {
      setBanning(false)
    }
  }

  const handleUnban = async (id) => {
    try {
      await api.adminUnbanIp(id)
      fetchAll()
    } catch (err) {
      alert(err.message)
    }
  }

  if (!user || !user.is_admin) {
    return (
      <div className="a-page">
        <div className="a-empty">
          <Icon name="lock" size={40} />
          <h2>Access Denied</h2>
          <p>Admin privileges required.</p>
          <Link to="/" className="a-btn a-btn-primary" style={{ marginTop: 8 }}>Go Home</Link>
        </div>
      </div>
    )
  }

  if (loading) return <div className="a-page"><Loading label="Loading dashboard" /></div>

  if (error) {
    return (
      <div className="a-page">
        <div className="a-empty">
          <Icon name="alertTriangle" size={40} />
          <h2>Error</h2>
          <p>{error}</p>
          <button className="a-btn a-btn-primary" style={{ marginTop: 8 }} onClick={fetchAll}>Retry</button>
        </div>
      </div>
    )
  }

  const bannedSet = new Set(bannedIps.map(b => b.ip_address))

  return (
    <div className="a-page">
      {banModal && (
        <div className="a-modal-backdrop" onClick={() => { setBanModal(null); setBanReason('') }}>
          <div className="a-modal" onClick={e => e.stopPropagation()}>
            <div className="a-modal-head">
              <Icon name="shieldOff" size={18} />
              <h3>Ban IP Address</h3>
            </div>
            <code className="a-modal-ip">{banModal}</code>
            <input
              type="text"
              className="a-modal-input"
              placeholder="Reason (optional)"
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleBan()}
            />
            <div className="a-modal-actions">
              <button className="a-btn" onClick={() => { setBanModal(null); setBanReason('') }}>Cancel</button>
              <button className="a-btn a-btn-danger" onClick={handleBan} disabled={banning}>
                {banning ? 'Banning...' : 'Ban IP'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="a-topbar">
        <div className="a-topbar-left">
          <h1 className="a-topbar-title">Dashboard</h1>
          <span className="a-live-dot" />
          <span className="a-live-text">Live</span>
        </div>
        <Link to="/" className="a-btn">
          <Icon name="arrowLeft" size={14} />
          Back to Madflix
        </Link>
      </header>

      <nav className="a-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`a-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
            {t.id === 'banned' && bannedIps.length > 0 && (
              <span className="a-tab-count">{bannedIps.length}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="a-content">
        {tab === 'overview' && (
          <>
            <div className="a-stats">
              <Stat label="Users" value={stats?.total_users ?? 0} icon="user" color="#60a5fa" sub={`+${stats?.new_users_week ?? 0} this week`} />
              <Stat label="Plays" value={stats?.total_plays ?? 0} icon="play" color="#c084fc" sub={`${stats?.plays_today ?? 0} today`} />
              <Stat label="Watchlist" value={stats?.total_watchlist ?? 0} icon="heart" color="#f87171" />
              <Stat label="Watch Time" value={formatDuration(stats?.total_watch_time_seconds ?? 0)} icon="clock" color="#4ade80" sub={`avg ${formatDuration(stats?.avg_session_seconds ?? 0)} / session`} />
              <Stat label="Active (7d)" value={stats?.active_users_7d ?? 0} icon="userCheck" color="#fbbf24" sub={`${stats?.new_users_today ?? 0} new today`} />
              <Stat label="Content" value={stats?.unique_content ?? 0} icon="film" color="#fb923c" sub={`${stats?.plays_this_week ?? 0} plays this week`} />
            </div>

            {stats?.daily_plays?.length > 0 && (
              <Panel title="Plays — Last 7 Days">
                <div className="a-chart">
                  {stats.daily_plays.map((day, i) => {
                    const max = Math.max(...stats.daily_plays.map(d => d.count), 1)
                    const pct = (day.count / max) * 100
                    return (
                      <div key={i} className="a-chart-col">
                        <div className="a-chart-bar-track">
                          <div className="a-chart-bar" style={{ height: `${Math.max(pct, 4)}%` }} />
                        </div>
                        <span className="a-chart-val">{day.count}</span>
                        <span className="a-chart-day">{new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}</span>
                      </div>
                    )
                  })}
                </div>
              </Panel>
            )}

            <div className="a-grid-2">
              <Panel title="Recent Activity">
                <div className="a-list">
                  {activity.slice(0, 8).map((item, i) => (
                    <ActivityRow key={i} item={item} bannedSet={bannedSet} onBan={(ip) => setBanModal(ip)} />
                  ))}
                  {activity.length === 0 && <p className="a-empty-text">No activity yet</p>}
                </div>
              </Panel>

              <Panel title="Live Sessions">
                <div className="a-list">
                  {liveSessions.slice(0, 8).map((s, i) => (
                    <div key={i} className="a-row">
                      <Badge style={{ bg: '#166534', color: '#4ade80' }}>LIVE</Badge>
                      <span className="a-row-user">{s.username}</span>
                      <span className="a-row-detail">
                        {s.title || `#${s.tmdb_id}`}
                        {s.progress_pct > 0 && ` · ${s.progress_pct}%`}
                      </span>
                      <span className="a-row-meta">
                        {s.device}
                        <code className="a-ip">{s.ip_address}</code>
                        {!bannedSet.has(s.ip_address) && (
                          <button className="a-ban-link" onClick={() => setBanModal(s.ip_address)}>Ban</button>
                        )}
                      </span>
                    </div>
                  ))}
                  {liveSessions.length === 0 && <p className="a-empty-text">No active sessions</p>}
                </div>
              </Panel>
            </div>

            {stats?.devices && Object.keys(stats.devices).length > 0 && (
              <Panel title="Devices — Last 30 Days">
                <div className="a-chips">
                  {Object.entries(stats.devices)
                    .sort((a, b) => b[1] - a[1])
                    .map(([device, count]) => (
                      <div key={device} className="a-chip">
                        <span>{device}</span>
                        <span className="a-chip-count">{count}</span>
                      </div>
                    ))}
                </div>
              </Panel>
            )}
          </>
        )}

        {tab === 'activity' && (
          <Panel title="All Activity">
            <div className="a-list">
              {activity.map((item, i) => (
                <ActivityRow key={i} item={item} bannedSet={bannedSet} onBan={(ip) => setBanModal(ip)} />
              ))}
              {activity.length === 0 && <p className="a-empty-text">No activity yet</p>}
            </div>
          </Panel>
        )}

        {tab === 'users' && (
          <Panel title="Registered Users">
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Last Active</th>
                    <th>Plays</th>
                    <th>Watchlist</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={i}>
                      <td className="a-t-user">{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <Badge style={u.is_staff ? { bg: '#581c87', color: '#c084fc' } : { bg: '#27272a', color: '#a1a1aa' }}>
                          {u.is_staff ? 'Admin' : 'User'}
                        </Badge>
                      </td>
                      <td>{u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '—'}</td>
                      <td>{u.last_active ? formatTimeAgo(u.last_active) : 'Never'}</td>
                      <td>{u.play_count ?? 0}</td>
                      <td>{u.watchlist_count ?? 0}</td>
                      <td>{formatDuration(u.total_watch_seconds ?? 0)}</td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan="8" className="a-empty-text">No users</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {tab === 'content' && (
          <Panel title="Most Watched Content">
            <div className="a-content-list">
              {[...(topContent.movies || []), ...(topContent.shows || [])]
                .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
                .map((item, i) => (
                  <div key={`${item.tmdb_id}-${item.season}-${item.episode}-${i}`} className="a-content-row">
                    <span className="a-rank">#{i + 1}</span>
                    <div className="a-content-info">
                      <span className="a-content-title">
                        {item.title || `TMDB #${item.tmdb_id}`}
                        {item.season && item.episode && <span className="a-content-ep"> S{item.season}E{item.episode}</span>}
                      </span>
                      <span className="a-content-meta">
                        <Badge style={item.media_type === 'tv' ? { bg: '#1e3a5f', color: '#60a5fa' } : { bg: '#713f12', color: '#fbbf24' }}>
                          {item.media_type === 'tv' ? 'TV' : 'Movie'}
                        </Badge>
                        <span>{item.play_count} plays</span>
                        <span>{item.unique_viewers} viewers</span>
                        {item.total_time > 0 && <span>{formatDuration(item.total_time)}</span>}
                      </span>
                    </div>
                  </div>
                ))}
              {(!topContent.movies?.length && !topContent.shows?.length) && <p className="a-empty-text">No content data yet</p>}
            </div>
          </Panel>
        )}

        {tab === 'live' && (
          <Panel title="Active Sessions">
            <div className="a-list">
              {liveSessions.map((s, i) => (
                <div key={i} className="a-row">
                  <Badge style={{ bg: '#166534', color: '#4ade80' }}>LIVE</Badge>
                  <span className="a-row-user">{s.username}</span>
                  <span className="a-row-detail">
                    {s.title || `#${s.tmdb_id}`}
                    {s.season && s.episode && ` · S${s.season}E${s.episode}`}
                  </span>
                  <span className="a-row-meta">
                    {s.progress_pct}% · {formatDuration(s.position_seconds)} / {formatDuration(s.duration_seconds)} · {s.device}
                    <code className="a-ip">{s.ip_address}</code>
                    {!bannedSet.has(s.ip_address) && (
                      <button className="a-ban-link" onClick={() => setBanModal(s.ip_address)}>Ban</button>
                    )}
                  </span>
                </div>
              ))}
              {liveSessions.length === 0 && <p className="a-empty-text">No active sessions</p>}
            </div>
          </Panel>
        )}

        {tab === 'searches' && (
          <div className="a-grid-2">
            <Panel title="Search Stats">
              <div className="a-search-big">
                <span className="a-search-num">{searchStats?.searches_today ?? 0}</span>
                <span className="a-search-label">Searches Today</span>
              </div>
              <h4 className="a-sub-head">Top Queries</h4>
              <div className="a-list">
                {(searchStats?.top_queries || []).map((q, i) => (
                  <div key={i} className="a-row">
                    <span className="a-row-user">#{i + 1}</span>
                    <span className="a-row-detail" style={{ fontWeight: 600 }}>"{q.query}"</span>
                    <span className="a-row-meta">{q.count} searches</span>
                  </div>
                ))}
                {(!searchStats?.top_queries?.length) && <p className="a-empty-text">No search data yet</p>}
              </div>
            </Panel>

            <Panel title="Recent Searches">
              <div className="a-list">
                {recentSearches.map((s, i) => (
                  <div key={i} className="a-row">
                    <span className="a-row-detail" style={{ fontWeight: 600 }}>"{s.query}"</span>
                    <span className="a-row-user">{s.username}</span>
                    <span className="a-row-meta">
                      {s.results_count} results
                      {s.ip_address && (
                        <>
                          <code className="a-ip">{s.ip_address}</code>
                          {!bannedSet.has(s.ip_address) && (
                            <button className="a-ban-link" onClick={() => setBanModal(s.ip_address)}>Ban</button>
                          )}
                        </>
                      )}
                      <span className="a-row-time">{formatTimeAgo(s.timestamp)}</span>
                    </span>
                  </div>
                ))}
                {recentSearches.length === 0 && <p className="a-empty-text">No searches yet</p>}
              </div>
            </Panel>
          </div>
        )}

        {tab === 'banned' && (
          <Panel title="Banned IP Addresses">
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Reason</th>
                    <th>Banned By</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bannedIps.map((b) => (
                    <tr key={b.id}>
                      <td className="a-t-user"><code className="a-ip">{b.ip_address}</code></td>
                      <td>{b.reason || '—'}</td>
                      <td>{b.banned_by}</td>
                      <td>{new Date(b.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className="a-btn a-btn-sm a-btn-danger" onClick={() => handleUnban(b.id)}>
                          <Icon name="shieldCheck" size={12} /> Unban
                        </button>
                      </td>
                    </tr>
                  ))}
                  {bannedIps.length === 0 && <tr><td colSpan="5" className="a-empty-text">No banned IPs</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
