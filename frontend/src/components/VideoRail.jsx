export default function VideoRail({ videos = [] }) {
  const playable = videos.filter((video) => video.site === 'YouTube').slice(0, 4)
  if (!playable.length) return null

  return (
    <div className="video-rail">
      {playable.map((video) => (
        <div className="video-card" key={video.id}>
          <iframe
            title={video.name}
            src={`https://www.youtube.com/embed/${video.key}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <div className="video-name">{video.name}</div>
        </div>
      ))}
    </div>
  )
}
