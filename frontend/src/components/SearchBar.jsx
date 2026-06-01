import { useEffect, useState } from 'react'

export default function SearchBar({ initialValue = '', onSubmit }) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue || '')
  }, [initialValue])

  function handleSubmit(event) {
    event.preventDefault()
    if (onSubmit) {
      onSubmit(value.trim())
    }
  }

  return (
    <form className="search" onSubmit={handleSubmit}>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search movies, shows, people"
        aria-label="Search"
      />
      <button type="submit">Search</button>
    </form>
  )
}
