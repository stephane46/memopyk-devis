import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useQuotesList } from '../../../lib/hooks/useQuotes';

import QuotesListPage from './List';

vi.mock('../../../lib/hooks/useQuotes', () => ({
  useQuotesList: vi.fn(),
}));

const mockedUseQuotesList = useQuotesList as unknown as Mock;

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/admin/quotes']}>
      <QuotesListPage />
    </MemoryRouter>,
  );
}

describe('Admin Quotes List page', () => {
  beforeEach(() => {
    mockedUseQuotesList.mockReset();
  });

  it('shows a loading indicator while fetching', () => {
    mockedUseQuotesList.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithRouter();

    expect(screen.getByText(/Chargement…/i)).toBeInTheDocument();
  });

  it('shows the empty state when there are no quotes and no filters', () => {
    mockedUseQuotesList.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithRouter();

    expect(screen.getByText(/Aucun devis pour le moment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Créer un premier devis/i })).toBeInTheDocument();
  });

  it('shows an error message and a retry button when the query fails', () => {
    mockedUseQuotesList.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Boom'),
      refetch: vi.fn(),
    });

    renderWithRouter();

    expect(screen.getByText(/Impossible de charger les devis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Réessayer/i })).toBeInTheDocument();
  });
});
