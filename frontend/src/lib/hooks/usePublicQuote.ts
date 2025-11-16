import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { acceptQuoteOnPaper, acceptQuoteOnline, getPublicQuote } from '../api'
import type { OnlineAcceptancePayload, QuoteAggregateResponse } from '../types/quotes'

export function usePublicQuote(token: string | undefined, pin?: string) {
  return useQuery<QuoteAggregateResponse, Error>({
    queryKey: ['public-quote', token, pin ?? null],
    queryFn: () => {
      if (!token) {
        throw new Error('Public token is required')
      }

      return getPublicQuote(token, pin)
    },
    enabled: !!token,
  })
}

export function useAcceptQuoteOnline(token: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, OnlineAcceptancePayload>({
    mutationFn: (payload) => {
      if (!token) {
        return Promise.reject(new Error('Public token is required'))
      }

      return acceptQuoteOnline(token, payload)
    },
    onSuccess: () => {
      if (token) {
        queryClient.invalidateQueries({ queryKey: ['public-quote', token] })
      }
    },
  })
}

export function useAcceptQuoteOnPaper(quoteId: string | undefined, token: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, void>({
    mutationFn: () => {
      if (!quoteId) {
        return Promise.reject(new Error('Quote id is required'))
      }

      return acceptQuoteOnPaper(quoteId)
    },
    onSuccess: () => {
      if (token) {
        queryClient.invalidateQueries({ queryKey: ['public-quote', token] })
      }
    },
  })
}
