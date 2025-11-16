import { useMutation, useQuery } from '@tanstack/react-query'

import { getQuotePdfJob, requestQuotePdf } from './api'
import type { QuotePdfJobStatus } from './types/quotes'

export function useQuotePdfJob(jobId: string | null) {
  return useQuery<QuotePdfJobStatus, Error>({
    queryKey: ['quote-pdf-job', jobId],
    queryFn: () => getQuotePdfJob(jobId as string),
    enabled: !!jobId,
    refetchInterval: (query) =>
      query.state.data && query.state.data.status === 'pending' ? 3000 : false,
  })
}

export function useRequestQuotePdf(quoteId: string, versionId: string | null) {
  return useMutation<QuotePdfJobStatus, Error, void>({
    mutationFn: () => {
      if (!versionId) {
        return Promise.reject(new Error('version_unavailable'))
      }
      return requestQuotePdf(quoteId, versionId)
    },
  })
}
