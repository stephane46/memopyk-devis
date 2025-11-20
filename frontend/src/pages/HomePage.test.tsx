import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'

describe('HomePage page title', () => {
  it('sets the page title for the home page', () => {
    document.title = ''

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(document.title).toBe('MEMOPYK Devis — Accueil')
  })
})
