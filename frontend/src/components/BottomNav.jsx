import { NavLink } from 'react-router-dom'
import Icon from './Icon'

const ITEMS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/swipe', label: 'Swipe', icon: 'heart' },
  { to: '/clips', label: 'Clips', icon: 'clapper' },
  { to: '/communities', label: 'Community', icon: 'globe' },
  { to: '/messages', label: 'Messages', icon: 'chat' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav bottom-nav--5" aria-label="Bottom navigation">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <Icon name={item.icon} size={18} />
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
