import { Link } from 'react-router-dom'
import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'

export default function CastList({ cast = [] }) {
  const config = useImageConfig()
  if (!cast.length) return null

  return (
    <div className="cast-grid">
      {cast.map((member) => {
        const image = buildImageUrl(config, member.profile_path, 'profile')
        const name = member.name || 'Unknown'
        const role = member.character || member.job || 'Cast'
        const key = member.cast_id || member.credit_id || member.id
        return (
          <Link
            key={`${key}-${member.id}`}
            className="cast-card"
            to={`/search?q=${encodeURIComponent(name)}`}
          >
            <div className="cast-photo">
              {image ? (
                <img src={image} alt={name} loading="lazy" />
              ) : (
                <div className="cast-fallback">No photo</div>
              )}
            </div>
            <div className="cast-name">{name}</div>
            <div className="cast-role">{role}</div>
          </Link>
        )
      })}
    </div>
  )
}
