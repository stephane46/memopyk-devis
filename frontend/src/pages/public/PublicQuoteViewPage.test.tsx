import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { usePublicQuote, useAcceptQuoteOnline, usePublicPinSubmit } from '../../lib/hooks/usePublicQuote'
import { useQuotePdfJob, useRequestQuotePdf } from '../../lib/useQuotePdf'
import { PublicQuoteViewPage } from './PublicQuoteViewPage'

vi.mock('../../lib/hooks/usePublicQuote', () => ({
  usePublicQuote: vi.fn(),
  useAcceptQuoteOnline: vi.fn(),
  usePublicPinSubmit: vi.fn(),
}))

vi.mock('../../lib/useQuotePdf', () => ({
  useQuotePdfJob: vi.fn(),
  useRequestQuotePdf: vi.fn(),
}))

const mockedUsePublicQuote = usePublicQuote as unknown as Mock
const mockedUseAcceptQuoteOnline = useAcceptQuoteOnline as unknown as Mock
const mockedUsePublicPinSubmit = usePublicPinSubmit as unknown as Mock
const mockedUseQuotePdfJob = useQuotePdfJob as unknown as Mock
const mockedUseRequestQuotePdf = useRequestQuotePdf as unknown as Mock

function renderWithRouter(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/p/${token}`]}>
      <Routes>
        <Route path="/p/:token" element={<PublicQuoteViewPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicQuoteViewPage page title', () => {
  beforeEach(() => {
    mockedUsePublicQuote.mockReset()
    mockedUseAcceptQuoteOnline.mockReset()
    mockedUsePublicPinSubmit.mockReset()
    mockedUseQuotePdfJob.mockReset()
    mockedUseRequestQuotePdf.mockReset()
    document.title = ''

    mockedUseQuotePdfJob.mockReturnValue({
      data: null,
      isFetching: false,
    })

    mockedUseRequestQuotePdf.mockReturnValue({
      isPending: false,
      mutate: vi.fn(),
    })

    mockedUsePublicPinSubmit.mockReturnValue({
      isPending: false,
      isError: false,
      error: null,
      mutate: vi.fn(),
    })
  })

  it('sets the page title with the quote number when the public quote is loaded', () => {
    mockedUsePublicQuote.mockReturnValue({
      data: {
        data: {
          id: 'quote-3',
          number: 'DEV-2025-003',
          status: 'draft',
          customer_name: 'Client Public',
          title: 'Public quote',
          summary: '',
          validity_date: null,
          acceptanceMode: null,
          acceptedAt: null,
          acceptedByName: null,
          created_at: '2025-01-01T00:00:00.000Z',
          currency_code: 'EUR',
          current_version: {
            id: 'v1',
            version_number: 1,
            label: null,
            totals_net_cents: 10000,
            totals_tax_cents: 2000,
            totals_gross_cents: 12000,
            totals_deposit_cents: 0,
            totals_balance_cents: 12000,
            pdf_url: null,
            pdf_generated_at: null,
            lines: [],
          },
          versions: [],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    mockedUseAcceptQuoteOnline.mockReturnValue({
      isPending: false,
      isError: false,
      mutate: vi.fn(),
    })

    renderWithRouter('dummy-token')

    expect(document.title).toBe('MEMOPYK Devis — Devis client — DEV-2025-003')
  })
})

describe('PublicQuoteViewPage PIN and acceptance flows', () => {
	beforeEach(() => {
		mockedUsePublicQuote.mockReset()
		mockedUseAcceptQuoteOnline.mockReset()
		mockedUsePublicPinSubmit.mockReset()
		mockedUseQuotePdfJob.mockReset()
		mockedUseRequestQuotePdf.mockReset()

		mockedUseQuotePdfJob.mockReturnValue({
			data: null,
			isFetching: false,
		})

		mockedUseRequestQuotePdf.mockReturnValue({
			isPending: false,
			mutate: vi.fn(),
		})

		mockedUsePublicPinSubmit.mockReturnValue({
			isPending: false,
			isError: false,
			error: null,
			mutate: vi.fn(),
		})
	})

	it('shows the PIN form when the public API returns pin_required', () => {
		const error = Object.assign(new Error('PIN required'), {
			status: 403,
			code: 'pin_required',
		})

		mockedUsePublicQuote.mockReturnValue({
			data: null,
			isLoading: false,
			isError: true,
			error,
			refetch: vi.fn(),
		})

		mockedUseAcceptQuoteOnline.mockReturnValue({
			isPending: false,
			isError: false,
			mutate: vi.fn(),
		})

		const { getByText } = renderWithRouter('secure-token')

		// PIN gate UI should be visible
		getByText('Votre devis MEMOPYK')
		getByText(
			'Ce devis est protégé par un code à 6 chiffres. Saisissez le code reçu par MEMOPYK pour accéder au détail de votre projet.',
		)
	})

	it('submits acceptance with full_name and accept_cgv when the form is valid', () => {
		mockedUsePublicQuote.mockReturnValue({
			data: {
				data: {
					id: 'quote-accept',
					number: 'DEV-2025-010',
					status: 'sent',
					customer_name: 'Client Public',
					title: 'Acceptable quote',
					summary: '',
					validity_date: null,
					acceptanceMode: null,
					acceptedAt: null,
					acceptedByName: null,
					created_at: '2025-01-01T00:00:00.000Z',
					currency_code: 'EUR',
					current_version: {
						id: 'v1',
						version_number: 1,
						label: null,
						totals_net_cents: 10000,
						totals_tax_cents: 2000,
						totals_gross_cents: 12000,
						totals_deposit_cents: 0,
						totals_balance_cents: 12000,
						pdf_url: null,
						pdf_generated_at: null,
						lines: [],
					},
					versions: [],
				},
			},
			isLoading: false,
			isError: false,
			error: null,
			refetch: vi.fn(),
		})

		const mutate = vi.fn()
		mockedUseAcceptQuoteOnline.mockReturnValue({
			isPending: false,
			isError: false,
			mutate,
		})

		const { getByLabelText, getByText } = renderWithRouter('accept-token')

		const nameInput = getByLabelText('Nom et prénom') as HTMLInputElement
		fireEvent.change(nameInput, { target: { value: 'John Doe' } })

		const cgvCheckbox = getByLabelText(
			/Je confirme avoir lu et accepté les Conditions Générales de Vente MEMOPYK/i,
		) as HTMLInputElement
		fireEvent.click(cgvCheckbox)

		const submitButton = getByText('Accepter le devis en ligne')
		fireEvent.click(submitButton)

		expect(mutate).toHaveBeenCalledWith(
			{
				full_name: 'John Doe',
				accept_cgv: true,
			},
			expect.any(Object),
		)
	})
})
