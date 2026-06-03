import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function ErrorState({ message, title = 'Something went wrong' }) {
  return (
    <div className="state error" role="alert">
      <div className="state-title">{title}</div>
      <p>{message || 'Please try again in a moment.'}</p>
      <Link to="/" className="btn btn-outline" style={{ marginTop: 12 }}>
        <Icon name="home" size={14} />
        Back home
      </Link>
    </div>
  )
}
