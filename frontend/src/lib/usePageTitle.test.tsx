import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { usePageTitle } from './usePageTitle'

function TestComponent({ title }: { title: string }) {
  usePageTitle(title)
  return null
}

describe('usePageTitle', () => {
  beforeEach(() => {
    document.title = ''
  })

  it('sets document.title on mount', () => {
    render(<TestComponent title="MEMOPYK Devis — Test" />)

    expect(document.title).toBe('MEMOPYK Devis — Test')
  })

  it('updates document.title when the title changes', () => {
    const { rerender } = render(<TestComponent title="MEMOPYK Devis — First" />)

    expect(document.title).toBe('MEMOPYK Devis — First')

    rerender(<TestComponent title="MEMOPYK Devis — Second" />)

    expect(document.title).toBe('MEMOPYK Devis — Second')
  })

  it('falls back to the base title when called with an empty string', () => {
    render(<TestComponent title="" />)

    expect(document.title).toBe('MEMOPYK Devis')
  })
})
