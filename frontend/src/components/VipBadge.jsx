import Icon from './Icon'

export default function VipBadge({ size = 11, label = false }) {
  return (
    <span className={`vip-badge${label ? ' vip-badge--label' : ''}`} title="Madflix VIP">
      <Icon name="star" size={size} />
      <span>VIP</span>
    </span>
  )
}
