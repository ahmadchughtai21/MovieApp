const FALLBACK_BASE = 'https://image.tmdb.org/t/p/'

const SIZE_MAP = {
  poster: 'w342',
  backdrop: 'w1280',
  profile: 'w185'
}

export function buildImageUrl(config, path, type = 'poster', size) {
  if (!path) return ''
  const base = config?.baseUrl || FALLBACK_BASE
  const selectedSize = size || config?.sizes?.[type] || SIZE_MAP[type] || 'w342'
  return `${base}${selectedSize}${path}`
}

export function pickImageSize(list, preferred, fallback) {
  if (!Array.isArray(list) || list.length === 0) return preferred || fallback
  if (preferred && list.includes(preferred)) return preferred
  return list[list.length - 1]
}
