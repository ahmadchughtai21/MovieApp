import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Icon from '../components/Icon'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="page">
      <div className="state">
        <div className="state-title" style={{ fontSize: '1.5rem' }}>404</div>
        <h2 style={{ marginTop: 8 }}>This page wandered off</h2>
        <p>The page you requested doesn't exist or has been moved.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
          <Icon name="home" size={14} />
          Back to home
        </Link>
      </div>
    </div>
  )
}
