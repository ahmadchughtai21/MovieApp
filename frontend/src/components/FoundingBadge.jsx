import Icon from './Icon'

export default function FoundingBadge({ size = 13, label = false }) {
  return (
    <span
      className={`founding-badge${label ? ' founding-badge--label' : ''}`}
      title="Founding member · first 100 on Madflix"
    >
      <Icon name="award" size={size} />
      {label && <span>Founding member</span>}
    </span>
  )
}
