import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminDashboardPage } from './AdminDashboardPage'

describe('AdminDashboardPage page title', () => {
  it('sets the page title for the admin dashboard', () => {
    document.title = ''

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    )

    expect(document.title).toBe('MEMOPYK Devis — Tableau de bord')
  })
})
