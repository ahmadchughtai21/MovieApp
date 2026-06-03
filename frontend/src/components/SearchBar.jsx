import { useEffect, useState } from 'react'
import Icon from './Icon'

export default function SearchBar({ initialValue = '', onSubmit, placeholder = 'Search movies, shows, people…' }) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue || '')
  }, [initialValue])

  function handleSubmit(event) {
    event.preventDefault()
    if (onSubmit) onSubmit(value.trim())
  }

  return (
    <form className="search" onSubmit={handleSubmit} role="search">
      <span className="search-icon" aria-hidden="true">
        <Icon name="search" size={15} />
      </span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        type="search"
      />
      <button type="submit">Search</button>
    </form>
  )
}
