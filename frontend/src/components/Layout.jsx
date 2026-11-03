import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTVNavigation } from '../hooks/useTVNavigation'
import InstallPrompt from './InstallPrompt'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Layout() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const shellRef = useRef(null)
  useTVNavigation(shellRef)

  useEffect(() => {
    let frame = 0
    function onScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 40)
        frame = 0
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [location.pathname])

  return (
    <div className="app-shell" ref={shellRef}>
      <Header key={location.pathname} scrolled={scrolled} />

      <main className="main-content">
        <div className="main-content-inner">
          <Outlet />
        </div>
      </main>

      <BottomNav />
      <InstallPrompt />
    </div>
  )
}
