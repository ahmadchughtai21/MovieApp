export const PRESET_AVATARS = [
  { id: 'reel', src: '/avatars/reel.svg', label: 'Film reel' },
  { id: 'clapper', src: '/avatars/clapper.svg', label: 'Clapperboard' },
  { id: 'ticket', src: '/avatars/ticket.svg', label: 'Ticket' },
  { id: 'projector', src: '/avatars/projector.svg', label: 'Projector' },
  { id: 'star', src: '/avatars/star.svg', label: 'Star' },
  { id: 'popcorn', src: '/avatars/popcorn.svg', label: 'Popcorn' },
  { id: 'mask', src: '/avatars/mask.svg', label: 'Theater mask' },
  { id: 'camera', src: '/avatars/camera.svg', label: 'Camera' },
  { id: 'tv', src: '/avatars/tv.svg', label: 'TV' },
  { id: 'spotlight', src: '/avatars/spotlight.svg', label: 'Spotlight' },
  { id: 'film', src: '/avatars/film.svg', label: 'Film strip' },
  { id: 'critic', src: '/avatars/critic.svg', label: 'Critic' },
]

export function isPresetAvatar(url) {
  return Boolean(url) && PRESET_AVATARS.some((a) => a.src === url)
}
