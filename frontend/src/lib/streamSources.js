export const STREAM_SOURCES = [
  {
    id: 'vidsrc',
    name: 'VidSrc',
    build: ({ id, season, episode }) =>
      season != null
        ? `https://vidsrc-embed.ru/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`
        : `https://vidsrc-embed.ru/embed/movie/${id}`
  },
  {
    id: 'vidsrc-to',
    name: 'VidSrc.to',
    build: ({ id, season, episode }) =>
      season != null
        ? `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`
        : `https://vidsrc.to/embed/movie/${id}`
  },
  {
    id: '2embed',
    name: '2Embed',
    build: ({ id, season, episode }) =>
      season != null
        ? `https://www.2embed.cc/embed/${id}?s=${season}&e=${episode}`
        : `https://www.2embed.cc/embed/${id}`
  },
  {
    id: 'vidsrc-io',
    name: 'VidSrc.io',
    build: ({ id, season, episode }) =>
      season != null
        ? `https://vidsrc.io/embed/tv/${id}/${season}/${episode}`
        : `https://vidsrc.io/embed/movie/${id}`
  },
  {
    id: 'streamvid',
    name: 'StreamVid',
    build: ({ id, season, episode }) =>
      season != null
        ? `https://streamvid.net/embed/tv/${id}/${season}/${episode}`
        : `https://streamvid.net/embed/movie/${id}`
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    build: ({ id, season, episode }) =>
      season != null
        ? `https://multiembed.mov/?video_id=${id}&s=${season}&e=${episode}&tmdb=1`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1`
  }
]

export function buildStreamSources({ id, season, episode } = {}) {
  if (!id) return []
  return STREAM_SOURCES.map((source) => ({
    id: source.id,
    name: source.name,
    url: source.build({ id, season, episode })
  }))
}
