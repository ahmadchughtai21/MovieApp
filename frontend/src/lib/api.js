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
    const error = new Error(text || `Request failed: ${res.status}`)
    error.status = res.status
    throw error
  }
  return res.json()
}

async function fetchPatch(path, body) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Token ${token}`
  const res = await fetch(buildUrl(path), { method: 'PATCH', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const text = await res.text()
    const error = new Error(text || `Request failed: ${res.status}`)
    error.status = res.status
    throw error
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

async function fetchMultipart(path, formData) {
  const token = getToken()
  const headers = {}
  if (token) headers['Authorization'] = `Token ${token}`
  const res = await fetch(buildUrl(path), { method: 'POST', headers, body: formData })
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
  searchPeople: (query) => fetchJson('/tmdb/person/search/', { q: query }),
  personDetails: (personId) => fetchJson(`/tmdb/person/${personId}/`),
  moviePosters: (movieId) => fetchJson(`/tmdb/movie/${movieId}/posters/`),
  vipCheckout: (plan = 'monthly') =>
    fetchPost('/vip/checkout/', { plan, payment_method: 'demo' }),

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
  adminModeration: () => fetchJson('/admin/moderation/'),
  adminReportResolve: (reportId, resolved) => fetchPost(`/admin/reports/${reportId}/resolve/`, { resolved }),
  adminDeleteClip: (clipId) => fetchDelete(`/admin/clips/${clipId}/`),
  adminDeleteComment: (commentId) => fetchDelete(`/admin/comments/${commentId}/`),
  adminDeleteReply: (replyId) => fetchDelete(`/admin/replies/${replyId}/`),

  recommendations: (excludeIds) => fetchJson('/recommendations/', excludeIds && excludeIds.length ? { exclude: excludeIds.join(',') } : undefined),
  movieRecommendations: (movieId) => fetchJson(`/recommendations/for-movie/${movieId}/`),
  showRecommendations: (showId) => fetchJson(`/recommendations/for-show/${showId}/`),

  // Logs
  logList: (mediaType) => fetchJson(`/logs/${mediaType ? `?media_type=${mediaType}` : ''}`),
  logAdd: (data) => fetchPost('/logs/add/', data),
  logDelete: (logId) => fetchDelete(`/logs/${logId}/`),
  logForMovie: (tmdbId, mediaType) => fetchJson(`/logs/for-movie/${tmdbId}/`, mediaType ? { media_type: mediaType } : undefined),
  logForUser: (username) => fetchJson(`/logs/for-user/${username}/`),
  logStats: (tmdbId) => fetchJson(`/logs/stats/${tmdbId}/`),
  logToggleLike: (logId) => fetchPost(`/logs/${logId}/like/`, {}),
  reviewDetail: (logId) => fetchJson(`/reviews/${logId}/`),
  reviewReplies: (logId) => fetchJson(`/logs/${logId}/replies/`),
  reviewReplyCreate: (logId, body, parentId) => fetchPost(`/logs/${logId}/replies/create/`, parentId ? { body, parent_id: parentId } : { body }),
  reviewReplyDelete: (logId, replyId) => fetchDelete(`/logs/${logId}/replies/${replyId}/delete/`),
  reviewReplyToggleLike: (logId, replyId) => fetchPost(`/logs/${logId}/replies/${replyId}/like/`, {}),

  // Profiles
  publicProfile: (username) => fetchJson(`/profile/${username}/`),
  profileFollowers: (username) => fetchJson(`/profile/${username}/followers/`),
  profileFollowing: (username) => fetchJson(`/profile/${username}/following/`),
  updateProfile: (data) => fetchPut('/auth/profile/', data),
  uploadAvatar: (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return fetchMultipart('/auth/profile/avatar/', formData)
  },

  // Social
  followToggle: (username) => fetchPost(`/follow/${username}/`, {}),
  sendFriendRequest: (username) => fetchPost(`/friend-requests/send/${username}/`, {}),
  acceptFriendRequest: (requestId) => fetchPost(`/friend-requests/${requestId}/accept/`, {}),
  declineFriendRequest: (requestId) => fetchPost(`/friend-requests/${requestId}/decline/`, {}),
  removeFriend: (username) => fetchDelete(`/friends/${username}/remove/`),
  reportUser: (username, data) => fetchPost(`/users/${username}/report/`, data),
  feed: (scope = 'friends') => fetchJson('/feed/', { scope }),
  suggestedUsers: () => fetchJson('/users/suggested/'),
  userSearch: (query) => fetchJson('/users/search/', { query }),

  // CineSwipe / City / Circles / DMs
  searchCities: (query) => fetchJson('/cities/search/', { q: query }),
  getSwipeCandidates: () => fetchJson('/swipe/discover/'),
  sendSwipeAction: (targetUserId, action) =>
    fetchPost('/swipe/action/', { target_user_id: targetUserId, action }),
  updateUserCity: (city, country) =>
    fetchPatch('/auth/profile/', { location_city: city, location_country: country }),
  socialFollowers: () => fetchJson('/social/followers/'),
  communities: () => fetchJson('/communities/'),
  communityMessages: (slug, page = 1) => fetchJson(`/communities/${slug}/messages/`, { page }),
  joinCommunity: (slug) => fetchPost(`/communities/${slug}/join/`, {}),
  createCommunity: (data, coverFile) => {
    if (coverFile) {
      const formData = new FormData()
      formData.append('name', data.name || '')
      formData.append('about', data.about || '')
      formData.append('genre_tag', data.genre_tag || 'General')
      formData.append('cover', coverFile)
      return fetchMultipart('/communities/create/', formData)
    }
    return fetchPost('/communities/create/', data)
  },
  communityDetail: (slug) => fetchJson(`/communities/${slug}/`),
  uploadCommunityCover: (slug, file) => {
    const formData = new FormData()
    formData.append('cover', file)
    return fetchMultipart(`/communities/${slug}/cover/`, formData)
  },
  leaveCommunity: (slug) => fetchDelete(`/communities/${slug}/leave/`),
  deleteCommunity: (slug) => fetchDelete(`/communities/${slug}/delete/`),
  myGroups: () => fetchJson('/messages/groups/'),
  notifications: () => fetchJson('/notifications/'),
  importLetterboxd: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return fetchMultipart('/import/letterboxd/', formData)
  },
  dmConversation: (userId) => fetchJson(`/dm/${userId}/`),

  // Clips
  clips: (params = {}) => fetchJson('/clips/', params),
  clipCreate: (formData) => fetchMultipart('/clips/create/', formData),
  clipDetail: (clipId) => fetchJson(`/clips/${clipId}/`),
  clipDelete: (clipId) => fetchDelete(`/clips/${clipId}/delete/`),
  clipUpdate: (clipId, data) => fetchPost(`/clips/${clipId}/update/`, data),
  clipLikeToggle: (clipId) => fetchPost(`/clips/${clipId}/like/`, {}),
  clipComments: (clipId) => fetchJson(`/clips/${clipId}/comments/`),
  clipCommentCreate: (clipId, body) => fetchPost(`/clips/${clipId}/comments/create/`, { body }),
  clipCommentDelete: (clipId, commentId) => fetchDelete(`/clips/${clipId}/comments/${commentId}/delete/`),
  clipReport: (clipId, data) => fetchPost(`/clips/${clipId}/report/`, data),
}
