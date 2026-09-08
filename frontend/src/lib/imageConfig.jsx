import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { pickImageSize } from './image'

const ImageConfigContext = createContext({
  baseUrl: 'https://image.tmdb.org/t/p/',
  sizes: {
    poster: 'w342',
    backdrop: 'w1280',
    profile: 'w185'
  },
  ready: false
})

export function ImageConfigProvider({ children }) {
  const [config, setConfig] = useState({
    baseUrl: 'https://image.tmdb.org/t/p/',
    sizes: {
      poster: 'w185',
      backdrop: 'w780',
      profile: 'w185'
    },
    ready: false
  })

  useEffect(() => {
    let active = true
    api.config()
      .then((data) => {
        const images = data?.images || {}
        const poster = pickImageSize(images.poster_sizes, 'w185', 'w185')
        const backdrop = pickImageSize(images.backdrop_sizes, 'w780', 'w780')
        const profile = pickImageSize(images.profile_sizes, 'w185', 'w185')
        if (active) {
          setConfig({
            baseUrl: images.secure_base_url || 'https://image.tmdb.org/t/p/',
            sizes: { poster, backdrop, profile },
            ready: true
          })
        }
      })
      .catch(() => {
        if (active) {
          setConfig((prev) => ({ ...prev, ready: true }))
        }
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => config, [config])
  return <ImageConfigContext.Provider value={value}>{children}</ImageConfigContext.Provider>
}

export function useImageConfig() {
  return useContext(ImageConfigContext)
}
