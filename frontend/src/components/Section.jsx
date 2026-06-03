import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function Section({ title, subtitle, action, actionLabel = 'View all', children }) {
  return (
    <section className="section">
      {(title || action) && (
        <div className="section-head">
          <div>
            {title ? <h2 className="section-title">{title}</h2> : null}
            {subtitle ? <p className="section-sub">{subtitle}</p> : null}
          </div>
          {action ? (
            <Link to={action} className="section-action">
              {actionLabel}
              <Icon name="arrowRight" size={12} />
            </Link>
          ) : null}
        </div>
      )}
      {children}
    </section>
  )
}
