import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="page">
      <div className="state">
        <h2>Page not found</h2>
        <p>The page you requested does not exist.</p>
        <Link to="/" className="btn primary">Go home</Link>
      </div>
    </div>
  )
}
