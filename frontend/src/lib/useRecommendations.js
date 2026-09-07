import { useState, useEffect, useRef } from 'react'

export function useRecommendations(tmdbId, mediaType, genres = []) {
  const [items, setItems] = useState([])
  const genresKey = useRef('')

  const key = genres.map((g) => g.id).join(',')
  const stableGenres = key !== genresKey.current ? genres : undefined
  if (key !== genresKey.current) genresKey.current = key

  useEffect(() => {
    if (!tmdbId || genres.length === 0) return

    let active = true
    const genreIds = genres.map((g) => g.id).slice(0, 2)

    const fetchPromises = genreIds.map((genreId) => {
      const endpoint = mediaType === 'tv'
        ? `/api/shows/genre/?genre_id=${genreId}&page=1`
        : `/api/movies/genre/?genre_id=${genreId}&page=1`
      return fetch(endpoint)
        .then((r) => r.json())
        .then((data) => data.results || [])
        .catch(() => [])
    })

    Promise.all(fetchPromises)
      .then((results) => {
        if (!active) return
        const seen = new Set([String(tmdbId)])
        const merged = []

        for (const list of results) {
          for (const item of list) {
            const id = String(item.id)
            if (seen.has(id)) continue
            seen.add(id)
            const overlap = (item.genre_ids || []).filter((gid) => genreIds.includes(gid)).length
            merged.push({ ...item, _relevance: overlap })
          }
        }

        merged.sort((a, b) => b._relevance - a._relevance || b.popularity - a.popularity)
        setItems(merged.slice(0, 12))
      })
      .catch(() => {})

    return () => { active = false }
  }, [tmdbId, mediaType, key])

  return { items }
}
