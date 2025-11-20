import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { acceptQuoteOnPaper, acceptQuoteOnline, getPublicQuote, submitPublicPin } from '../api'
import type { OnlineAcceptancePayload, QuoteAggregateResponse } from '../types/quotes'

// Core hook used by the public quote view: fetch the public quote via token.
export function usePublicQuoteGet(token: string | undefined) {
  return useQuery<QuoteAggregateResponse, Error>({
    queryKey: ['public-quote', token],
    queryFn: () => {
      if (!token) {
        throw new Error('Public token is required')
      }

      return getPublicQuote(token)
    },
    enabled: !!token,
  })
}

// Hook to submit a PIN for a given public token and refresh the quote on success.
export function usePublicPinSubmit(token: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<{ pin_valid: true }, Error, { pin: string }>({
    mutationFn: ({ pin }) => {
      if (!token) {
        return Promise.reject(new Error('Public token is required'))
      }

      return submitPublicPin(token, pin)
    },
    onSuccess: () => {
      if (token) {
        queryClient.invalidateQueries({ queryKey: ['public-quote', token] })
      }
    },
  })
}

// Hook to accept a quote via the public token and refresh the quote on success.
export function usePublicAcceptQuote(token: string | undefined) {
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

// Backward-compatible wrappers used by older code/tests.
export function usePublicQuote(token: string | undefined, _pin?: string) {
  return usePublicQuoteGet(token)
}

export function useAcceptQuoteOnline(token: string | undefined) {
  return usePublicAcceptQuote(token)
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
