import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createQuote,
  type CreateQuotePayload,
  type CreateQuoteResponse,
  createQuoteVersion,
  type CreateQuoteVersionPayload,
  getQuote,
  listQuoteVersions,
  listQuotes,
  publishQuoteVersion,
  updateQuote,
  type UpdateQuotePayload,
} from '../api'
import type {
  QuoteAggregate,
  QuoteAggregateResponse,
  QuoteListResponse,
  QuoteVersionSummary,
  QuoteVersionsListResponse,
} from '../types/quotes'

export function useQuotesList(params: { q?: string; status?: string; page?: number; page_size?: number }) {
  return useQuery<QuoteListResponse>({
    queryKey: ['quotes', params],
    queryFn: () => listQuotes(params),
  })
}

export function useUpdateQuote(quoteId: string) {
  const queryClient = useQueryClient()

  return useMutation<QuoteAggregate, Error, UpdateQuotePayload>({
    mutationFn: (payload) => updateQuote(quoteId, payload),
    onSuccess: (updatedQuote) => {
      queryClient.setQueryData<QuoteAggregateResponse>(['quote', quoteId], { data: updatedQuote })
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    },
  })
}

export function useQuoteVersions(quoteId: string) {
	return useQuery<QuoteVersionsListResponse, Error>({
		queryKey: ['quote-versions', quoteId],
		queryFn: () => listQuoteVersions(quoteId),
		enabled: !!quoteId,
	})
}

export function useCreateQuoteVersion(quoteId: string) {
	const queryClient = useQueryClient()

	return useMutation<QuoteVersionSummary, Error, CreateQuoteVersionPayload | undefined>({
		mutationFn: (payload) => createQuoteVersion(quoteId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quote-versions', quoteId] })
			queryClient.invalidateQueries({ queryKey: ['quote', quoteId] })
		},
	})
}

export function usePublishQuoteVersion(quoteId: string) {
	const queryClient = useQueryClient()

	return useMutation<void, Error, string>({
		mutationFn: (versionId) => publishQuoteVersion(quoteId, versionId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quote-versions', quoteId] })
			queryClient.invalidateQueries({ queryKey: ['quote', quoteId] })
		},
	})
}

export function useQuote(quoteId: string) {
  return useQuery<QuoteAggregateResponse>({
    queryKey: ['quote', quoteId],
    queryFn: () => getQuote(quoteId),
    enabled: !!quoteId,
  })
}

export function useCreateQuote() {
  const queryClient = useQueryClient()

  return useMutation<CreateQuoteResponse, Error, CreateQuotePayload>({
    mutationFn: (payload) => createQuote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    },
  })
}
