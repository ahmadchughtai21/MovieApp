import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Icon from './Icon'

const CATEGORY_LABELS = {
  stream: 'Streaming on',
  rent: 'Rent on',
  buy: 'Buy on',
}

function ProviderButton({ provider }) {
  return (
    <a
      href={provider.url}
      target="_blank"
      rel="noopener noreferrer"
      className="provider-btn"
      aria-label={`Watch on ${provider.name}`}
    >
      {provider.logo_path ? (
        <img
          className="provider-logo"
          src={provider.logo_path}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="provider-logo provider-logo-fallback">{provider.name.charAt(0)}</span>
      )}
      <span className="provider-name">{provider.name}</span>
      <Icon name="external" size={12} className="provider-ext" />
    </a>
  )
}

export default function WhereToWatch({ kind, id, title }) {
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!id) return undefined
    let active = true
    setLoaded(false)
    setData(null)

    const fetcher = kind === 'show' ? api.showWatchProviders : api.movieWatchProviders
    fetcher(id, { title })
      .then((res) => {
        if (active) {
          setData(res)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (active) setLoaded(true)
      })

    return () => {
      active = false
    }
  }, [kind, id, title])

  if (!loaded || !data?.has_any) return null

  const categories = data.providers

  return (
    <div className="where-to-watch">
      <div className="where-to-watch-head">
        <Icon name="play" size={12} />
        <span>Where to watch</span>
      </div>
      {Object.entries(categories).map(([key, items]) =>
        items.length ? (
          <div key={key} className="where-to-watch-row">
            <span className="where-to-watch-label">{CATEGORY_LABELS[key]}</span>
            <div className="where-to-watch-list">
              {items.map((provider) => (
                <ProviderButton key={`${key}-${provider.provider_id}`} provider={provider} />
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}
