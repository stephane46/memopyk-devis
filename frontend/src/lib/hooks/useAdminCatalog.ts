import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AdminBrandingConfig,
  type AdminBrandingGetResponse,
  type AdminBrandingUpdatePayload,
  type AdminProduct,
  type AdminProductListResponse,
  type AdminTaxRate,
  type AdminTaxRateListResponse,
  type CreateAdminProductPayload,
  type CreateAdminTaxRatePayload,
  type UpdateAdminProductPayload,
  type UpdateAdminTaxRatePayload,
  createAdminProduct,
  createAdminTaxRate,
  getAdminBranding,
  listAdminProducts,
  listAdminTaxRates,
  updateAdminBranding,
  updateAdminProduct,
  updateAdminTaxRate,
} from '../api'

export function useAdminTaxRates() {
  return useQuery<AdminTaxRateListResponse, Error>({
    queryKey: ['admin', 'tax-rates'],
    queryFn: () => listAdminTaxRates(),
  })
}

export function useCreateAdminTaxRate() {
  const queryClient = useQueryClient()

  return useMutation<AdminTaxRate, Error, CreateAdminTaxRatePayload>({
    mutationFn: (payload) => createAdminTaxRate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax-rates'] })
    },
  })
}

export function useUpdateAdminTaxRate() {
  const queryClient = useQueryClient()

  return useMutation<AdminTaxRate, Error, { id: string; payload: UpdateAdminTaxRatePayload }>({
    mutationFn: ({ id, payload }) => updateAdminTaxRate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tax-rates'] })
    },
  })
}

export function useAdminProducts() {
  return useQuery<AdminProductListResponse, Error>({
    queryKey: ['admin', 'products'],
    queryFn: () => listAdminProducts(),
  })
}

export function useCreateAdminProduct() {
  const queryClient = useQueryClient()

  return useMutation<AdminProduct, Error, CreateAdminProductPayload>({
    mutationFn: (payload) => createAdminProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

export function useUpdateAdminProduct() {
  const queryClient = useQueryClient()

  return useMutation<AdminProduct, Error, { id: string; payload: UpdateAdminProductPayload }>({
    mutationFn: ({ id, payload }) => updateAdminProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

export function useAdminBranding() {
  return useQuery<AdminBrandingGetResponse, Error>({
    queryKey: ['admin', 'branding'],
    queryFn: () => getAdminBranding(),
  })
}

export function useUpdateAdminBranding() {
  const queryClient = useQueryClient()

  return useMutation<AdminBrandingConfig, Error, AdminBrandingUpdatePayload>({
    mutationFn: (payload) => updateAdminBranding(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'branding'] })
    },
  })
}
