import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import Icon from '../components/Icon'
import PageBanner from '../components/PageBanner'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="page">
      <PageBanner
        title="404"
        subtitle="This page wandered off"
        eyebrow="Not found"
      />
      <div className="state">
        <div className="state-title">Page not found</div>
        <p className="error-state">The page you requested doesn't exist or has been moved.</p>
        <Link to="/" className="btn btn--accent">
          <Icon name="home" size={14} />
          Back to home
        </Link>
      </div>
    </div>
  )
}
