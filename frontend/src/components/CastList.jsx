import { Link } from 'react-router-dom'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'

export default function CastList({ cast = [] }) {
  const config = useImageConfig()
  if (!cast.length) return null

  return (
    <div className="cast-list">
      {cast.map((member) => {
        const image = buildImageUrl(config, member.profile_path, 'profile')
        const name = member.name
        return (
          <Link
            key={`${member.cast_id || member.credit_id}-${member.id}`}
            className="cast-card"
            to={`/search?q=${encodeURIComponent(name)}`}
          >
            {image ? <img src={image} alt={name} loading="lazy" /> : <div className="cast-fallback">No photo</div>}
            <div className="cast-meta">
              <div className="cast-name">{name}</div>
              <div className="cast-role">{member.character || member.job || 'Cast'}</div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
