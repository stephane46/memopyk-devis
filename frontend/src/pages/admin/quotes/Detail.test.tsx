import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useQuote } from '../../../lib/hooks/useQuotes'

import QuoteDetailPage from './Detail'

vi.mock('../../../lib/hooks/useQuotes', () => ({
  useQuote: vi.fn(),
}))

const mockedUseQuote = useQuote as unknown as Mock

function renderWithRouter(quoteId: string) {
  return render(
    <MemoryRouter initialEntries={[`/admin/quotes/${quoteId}`]}>
      <Routes>
        <Route path="/admin/quotes/:quoteId" element={<QuoteDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Admin Quote Detail page', () => {
  beforeEach(() => {
    mockedUseQuote.mockReset()
  })

  it('shows a loading indicator while fetching', () => {
    mockedUseQuote.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithRouter('quote-1')

    expect(screen.getByText(/Chargement…/i)).toBeInTheDocument()
  })

  it('shows the 404 not found message when the quote is missing', () => {
    mockedUseQuote.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 404 },
      refetch: vi.fn(),
    })

    renderWithRouter('quote-2')

    expect(screen.getByText(/Devis introuvable/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour à la liste/i })).toBeInTheDocument()
  })

  it('shows a generic error message and retry button when the query fails', () => {
    mockedUseQuote.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Boom'),
      refetch: vi.fn(),
    })

    renderWithRouter('quote-3')

    expect(screen.getByText(/Impossible d'afficher ce devis/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Réessayer/i })).toBeInTheDocument()
  })

  it('sets the page title with the quote number when the quote is loaded', () => {
    mockedUseQuote.mockReturnValue({
      data: {
        data: {
          id: 'quote-4',
          number: 'DEV-2025-001',
          status: 'draft',
          customer_name: 'Client',
          created_at: '2025-01-01T00:00:00.000Z',
          validity_date: null,
          currency_code: 'EUR',
          acceptanceMode: null,
          acceptedAt: null,
          acceptedByName: null,
          current_version: null,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithRouter('quote-4')

    expect(document.title).toBe('MEMOPYK Devis — Admin — DEV-2025-001')
  })
})
