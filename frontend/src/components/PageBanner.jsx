import { buildImageUrl } from '../lib/image'
import { useImageConfig } from '../lib/imageConfig'

export default function PageBanner({ title, subtitle, backdropPaths = [], eyebrow, actions, children }) {
  const config = useImageConfig()
  const layers = backdropPaths.filter(Boolean).slice(0, 3)

  return (
    <header className="page-banner">
      <div className="page-banner-bg" aria-hidden="true">
        {layers.map((path, i) => (
          <div
            key={path}
            className={`page-banner-layer page-banner-layer--${i}`}
            style={{ backgroundImage: `url(${buildImageUrl(config, path, 'backdrop', 'w1280')})` }}
          />
        ))}
        <div className="page-banner-shade" />
      </div>
      <div className="page-banner-inner">
        {eyebrow && <p className="page-banner-eyebrow">{eyebrow}</p>}
        <h1 className="page-banner-title">{title}</h1>
        {subtitle && <p className="page-banner-sub">{subtitle}</p>}
        {actions && <div className="page-banner-actions">{actions}</div>}
        {children}
      </div>
    </header>
  )
}
