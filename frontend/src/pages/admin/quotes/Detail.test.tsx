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
})
