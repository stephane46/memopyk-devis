import { useEffect } from 'react'

const BASE_TITLE = 'MEMOPYK Devis'

export function usePageTitle(title: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return

    document.title = title || BASE_TITLE
  }, [title])
}
