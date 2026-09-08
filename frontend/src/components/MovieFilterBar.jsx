import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Icon from './Icon'

export default function MovieFilterBar({ genres = [] }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [value, setValue] = useState(searchParams.get('q') || '')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    setValue(searchParams.get('q') || '')
  }, [searchParams])

  function handleSearch(e) {
    e.preventDefault()
    const q = value.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="movie-filter-bar">
      <div className="movie-filter-inner">
        <h2 className="movie-filter-heading">Find your next favorite movie</h2>

        <form
          className={`movie-search ${focused ? 'focused' : ''}`}
          onSubmit={handleSearch}
          role="search"
        >
          <span className="movie-search-icon" aria-hidden="true">
            <Icon name="search" size={18} />
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search by title, genre, or keyword..."
            aria-label="Search movies"
            type="search"
          />
          <button type="submit">Search</button>
        </form>

        {genres.length > 0 && (
          <div className="movie-genres">
            {genres.map((genre) => (
              <button
                key={genre.id}
                className="movie-genre-chip"
                onClick={() => navigate(`/movies?genre=${genre.id}`)}
              >
                <span>{genre.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
