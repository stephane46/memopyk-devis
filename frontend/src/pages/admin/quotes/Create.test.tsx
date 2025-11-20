import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import CreateQuotePage from './Create'
import { useCreateQuote } from '../../../lib/hooks/useQuotes'
import { useAdminBranding } from '../../../lib/hooks/useAdminCatalog'

vi.mock('../../../lib/hooks/useQuotes', () => ({
  useCreateQuote: vi.fn(),
}))

vi.mock('../../../lib/hooks/useAdminCatalog', () => ({
  useAdminBranding: vi.fn(),
}))

const mockedUseCreateQuote = useCreateQuote as unknown as Mock
const mockedUseAdminBranding = useAdminBranding as unknown as Mock

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/admin/quotes/new"]}>
      <CreateQuotePage />
    </MemoryRouter>,
  )
}

describe('Admin New Quote page branding defaults', () => {
  beforeEach(() => {
    mockedUseCreateQuote.mockReset()
    mockedUseAdminBranding.mockReset()
  })

  it('renders branding default validity and deposit hints when branding is loaded', () => {
    mockedUseAdminBranding.mockReturnValue({
      data: {
        data: {
          id: 'branding-1',
          label: 'default',
          company_name: 'MEMOPYK',
          logo_url: null,
          primary_color: '#000000',
          secondary_color: '#ffffff',
          pdf_footer_text: null,
          default_validity_days: 30,
          default_deposit_pct: 50,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    mockedUseCreateQuote.mockReturnValue({
      isPending: false,
      error: null,
      mutate: vi.fn(),
    })

    renderWithRouter()

    expect(screen.getByText(/Validité par défaut : 30 jours/i)).toBeInTheDocument()
    expect(screen.getByText(/Acompte par défaut : 50 %/i)).toBeInTheDocument()
  })

  it('submits the same payload shape as before (no validity or deposit fields)', () => {
    const mutate = vi.fn()

    mockedUseAdminBranding.mockReturnValue({
      data: { data: null },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    mockedUseCreateQuote.mockReturnValue({
      isPending: false,
      error: null,
      mutate,
    })

    renderWithRouter()

    fireEvent.change(screen.getByLabelText(/Titre du devis/i), {
      target: { value: 'Devis test' },
    })
    fireEvent.change(screen.getByLabelText(/Nom du client/i), {
      target: { value: 'Client Test' },
    })
    fireEvent.change(screen.getByLabelText(/Résumé \(optionnel\)/i), {
      target: { value: 'Résumé de test' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Créer le devis/i }))

    expect(mutate).toHaveBeenCalledTimes(1)
    const [payload] = mutate.mock.calls[0]

    expect(payload).toMatchObject({
      title: 'Devis test',
      customer_name: 'Client Test',
      notes: 'Résumé de test',
      currency: 'EUR',
      lines: [
        {
          description: 'Devis test',
          qty: 1,
          unit_amount_cents: 0,
          tax_rate_bps: 0,
        },
      ],
    })

    expect('valid_until' in payload).toBe(false)
    expect('deposit_pct' in payload).toBe(false)
  })
})
