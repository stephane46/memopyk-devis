import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useQuote, useUpdateQuote, useQuoteVersions, useCreateQuoteVersion, usePublishQuoteVersion } from '../../lib/hooks/useQuotes'
import { QuoteEditorPage } from './QuoteEditorPage'

vi.mock('../../lib/hooks/useQuotes', () => ({
  useQuote: vi.fn(),
  useUpdateQuote: vi.fn(),
  useQuoteVersions: vi.fn(),
  useCreateQuoteVersion: vi.fn(),
  usePublishQuoteVersion: vi.fn(),
}))

const mockedUseQuote = useQuote as unknown as Mock
const mockedUseUpdateQuote = useUpdateQuote as unknown as Mock
const mockedUseQuoteVersions = useQuoteVersions as unknown as Mock
const mockedUseCreateQuoteVersion = useCreateQuoteVersion as unknown as Mock
const mockedUsePublishQuoteVersion = usePublishQuoteVersion as unknown as Mock

function renderWithRouter(quoteId: string) {
  const queryClient = new QueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/devis/${quoteId}`]}>
        <Routes>
          <Route path="/devis/:id" element={<QuoteEditorPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('QuoteEditorPage page title', () => {
  beforeEach(() => {
    mockedUseQuote.mockReset()
    mockedUseUpdateQuote.mockReset()
    mockedUseQuoteVersions.mockReset()
    mockedUseCreateQuoteVersion.mockReset()
    mockedUsePublishQuoteVersion.mockReset()
    document.title = ''
  })

  it('sets the page title with the quote number when the quote is loaded', () => {
    mockedUseQuote.mockReturnValue({
      data: {
        data: {
          id: 'quote-2',
          number: 'DEV-2025-002',
          status: 'draft',
          customer_name: 'Client Test',
          title: 'Test quote',
          summary: '',
          validity_date: null,
          acceptanceMode: null,
          acceptedAt: null,
          acceptedByName: null,
          created_at: '2025-01-01T00:00:00.000Z',
          currency_code: 'EUR',
          current_version: null,
          versions: [],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    mockedUseUpdateQuote.mockReturnValue({
      isError: false,
      isPending: false,
      error: null,
      mutate: vi.fn(),
      reset: vi.fn(),
    })

    mockedUseQuoteVersions.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
    })

    mockedUseCreateQuoteVersion.mockReturnValue({
      isPending: false,
      isError: false,
      mutate: vi.fn(),
      reset: vi.fn(),
    })

    mockedUsePublishQuoteVersion.mockReturnValue({
      isPending: false,
      isError: false,
      mutate: vi.fn(),
      reset: vi.fn(),
    })

    renderWithRouter('quote-2')

    expect(document.title).toBe('MEMOPYK Devis — Éditeur — DEV-2025-002')
  })
})
