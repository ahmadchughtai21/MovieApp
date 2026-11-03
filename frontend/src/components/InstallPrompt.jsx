import { useEffect, useState } from 'react'
import Icon from './Icon'

const DISMISS_KEY = 'madflix:install-dismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function shouldShow() {
  return !isStandalone() && !localStorage.getItem(DISMISS_KEY)
}

export default function InstallPrompt() {
  const [iosHint] = useState(isIOS)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(() => shouldShow() && isIOS())

  useEffect(() => {
    if (!shouldShow()) return

    function onBeforeInstall(event) {
      event.preventDefault()
      setDeferredPrompt(event)
      setVisible(true)
    }

    function onInstalled() {
      setVisible(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!visible) return null

  async function install() {
    if (!deferredPrompt) {
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  return (
    <aside className="install-prompt" role="dialog" aria-label="Install Madflix">
      <span className="install-prompt-icon" aria-hidden="true">
        <Icon name="film" size={16} />
      </span>
      <div className="install-prompt-text">
        <strong>Install Madflix</strong>
        <span>
          {iosHint
            ? 'Tap Share, then “Add to Home Screen”.'
            : 'Add it to your home screen for a faster, app-like experience.'}
        </span>
      </div>
      {!iosHint && (
        <button type="button" className="btn btn--accent btn--sm" onClick={install}>
          Install
        </button>
      )}
      <button type="button" className="install-prompt-close" onClick={dismiss} aria-label="Dismiss">
        ×
      </button>
    </aside>
  )
}
