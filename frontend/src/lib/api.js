const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function buildUrl(path, params) {
  const fullPath = API_BASE + path
  // Handle both absolute and relative URLs
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

async function fetchJson(path, params) {
  const res = await fetch(buildUrl(path, params))
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
  showGenres: () => fetchJson('/genres/shows/')
}
