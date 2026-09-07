const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function buildUrl(path, params) {
  const fullPath = API_BASE + path
  const url = fullPath.startsWith('http')
    ? new URL(fullPath)
    : new URL(fullPath, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }
  return url.toString()
}

function getToken() {
  return localStorage.getItem('madflix_token')
}

async function fetchJson(path, params) {
  const token = getToken()
  const headers = {}
  if (token) headers['Authorization'] = `Token ${token}`
  const res = await fetch(buildUrl(path, params), { headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json()
}

async function fetchPost(path, body) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Token ${token}`
  const res = await fetch(buildUrl(path), { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json()
}

async function fetchDelete(path) {
  const token = getToken()
  const headers = {}
  if (token) headers['Authorization'] = `Token ${token}`
  const res = await fetch(buildUrl(path), { method: 'DELETE', headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

async function fetchPut(path, body) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Token ${token}`
  const res = await fetch(buildUrl(path), { method: 'PUT', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  home: () => fetchJson('/home/'),
  config: () => fetchJson('/config/'),
  endpoints: () => fetchJson('/endpoints/'),
  multiSearch: (query, page = 1) => fetchJson('/search/', { query, page }),

  moviesData: () => fetchJson('/movies/'),
  moviesTrending: (timeWindow = 'week') => fetchJson('/movies/trending/', { time_window: timeWindow }),
  moviesPopular: (page = 1) => fetchJson('/movies/popular/', { page }),
  moviesTopRated: (page = 1) => fetchJson('/movies/top-rated/', { page }),
  moviesUpcoming: (page = 1) => fetchJson('/movies/upcoming/', { page }),
  moviesNowPlaying: (page = 1) => fetchJson('/movies/now-playing/', { page }),
  moviesSearch: (query, page = 1) => fetchJson('/movies/search/', { query, page }),
  movieDetails: (movieId) => fetchJson(`/movies/${movieId}/`),
  movieWatchProviders: (movieId, { title, region = 'US' } = {}) =>
    fetchJson(`/movies/${movieId}/watch-providers/`, { title, region }),
  moviesByGenre: (genreId, page = 1) => fetchJson('/movies/genre/', { genre_id: genreId, page }),

  showsData: () => fetchJson('/shows/'),
  showsTrending: (timeWindow = 'week') => fetchJson('/shows/trending/', { time_window: timeWindow }),
  showsPopular: (page = 1) => fetchJson('/shows/popular/', { page }),
  showsTopRated: (page = 1) => fetchJson('/shows/top-rated/', { page }),
  showsAiringToday: (page = 1) => fetchJson('/shows/airing-today/', { page }),
  showsOnTheAir: (page = 1) => fetchJson('/shows/on-the-air/', { page }),
  showsSearch: (query, page = 1) => fetchJson('/shows/search/', { query, page }),
  showDetails: (showId, season = 1, episode = 1) => fetchJson(`/shows/${showId}/`, { season, episode }),
  showWatchProviders: (showId, { title, region = 'US' } = {}) =>
    fetchJson(`/shows/${showId}/watch-providers/`, { title, region }),
  showsByGenre: (genreId, page = 1) => fetchJson('/shows/genre/', { genre_id: genreId, page }),
  seasonDetails: (showId, seasonNumber) => fetchJson(`/shows/${showId}/season/${seasonNumber}/`),
  episodeDetails: (showId, seasonNumber, episodeNumber) =>
    fetchJson(`/shows/${showId}/season/${seasonNumber}/episode/${episodeNumber}/`),

  allGenres: () => fetchJson('/genres/'),
  movieGenres: () => fetchJson('/genres/movies/'),
  showGenres: () => fetchJson('/genres/shows/'),

  watchlist: (mediaType) => fetchJson('/watchlist/', mediaType ? { media_type: mediaType } : undefined),
  watchlistAdd: (data) => fetchPost('/watchlist/add/', data),
  watchlistRemove: (itemId) => fetchDelete(`/watchlist/${itemId}/`),
  watchlistCheck: (tmdbId, mediaType) => fetchJson('/watchlist/check/', { tmdb_id: tmdbId, media_type: mediaType }),

  history: () => fetchJson('/history/'),
  historyAdd: (data) => fetchPost('/history/add/', data),
  historyLatest: () => fetchJson('/history/latest/'),
  continueWatching: () => fetchJson('/continue-watching/'),
  markAsWatched: (data) => fetchPost('/history/mark-watched/', data),
  checkWatched: (tmdbId, mediaType, season, episode) => {
    const params = { tmdb_id: tmdbId, media_type: mediaType }
    if (season) params.season = season
    if (episode) params.episode = episode
    return fetchJson('/history/check-watched/', params)
  },

  sessionCreate: (data) => fetchPost('/sessions/create/', data),
  sessionUpdate: (sessionId, data) => fetchPut(`/sessions/${sessionId}/update/`, data),
  sessionResume: (tmdbId, mediaType, season, episode) => {
    const params = { tmdb_id: tmdbId, media_type: mediaType }
    if (season) params.season = season
    if (episode) params.episode = episode
    return fetchJson('/sessions/resume/', params)
  },

  adminStats: () => fetchJson('/admin/stats/'),
  adminActivity: (limit = 50) => fetchJson('/admin/activity/', { limit }),
  adminUsers: () => fetchJson('/admin/users/'),
  adminTopContent: (limit = 20) => fetchJson('/admin/top-content/', { limit }),
  adminLiveSessions: () => fetchJson('/admin/live/'),
  adminSearches: (limit = 50) => fetchJson('/admin/searches/', { limit }),
  adminSearchStats: () => fetchJson('/admin/search-stats/'),
  adminBannedIps: () => fetchJson('/admin/banned-ips/'),
  adminBanIp: (ipAddress, reason) => fetchPost('/admin/ban-ip/', { ip_address: ipAddress, reason }),
  adminUnbanIp: (banId) => fetchDelete(`/admin/unban-ip/${banId}/`),
}
