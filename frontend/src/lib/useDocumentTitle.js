import { useEffect } from 'react'

const BASE = 'Madflix'

export function useDocumentTitle(title) {
  useEffect(() => {
    const trimmed = typeof title === 'string' ? title.trim() : ''
    document.title = trimmed ? `${trimmed} · ${BASE}` : BASE
  }, [title])
}
