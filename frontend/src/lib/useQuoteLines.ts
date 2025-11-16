import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createQuoteLine, deleteQuoteLine, updateQuoteLine, type CreateQuoteLinePayload, type UpdateQuoteLinePayload } from './api'

export function useCreateLine(quoteId: string, versionId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, CreateQuoteLinePayload>({
    mutationFn: (payload) => createQuoteLine(quoteId, versionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] })
    },
  })
}

export function useUpdateLine(quoteId: string, versionId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { lineId: string; payload: UpdateQuoteLinePayload}>({
    mutationFn: ({ lineId, payload }) => updateQuoteLine(quoteId, versionId, lineId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] })
    },
  })
}

export function useDeleteLine(quoteId: string, versionId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (lineId) => deleteQuoteLine(quoteId, versionId, lineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] })
    },
  })
}
