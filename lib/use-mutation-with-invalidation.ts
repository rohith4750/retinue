/**
 * Custom hook for mutations with automatic query invalidation
 * This ensures all related queries are invalidated when a mutation succeeds
 * 
 * Usage: Replace useMutation with useMutationWithInvalidation and provide the endpoint
 */

import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { getRelatedQueryKeys } from './query-invalidation'

/**
 * Enhanced useMutation hook with automatic query invalidation
 * 
 * @example
 * // Before:
 * const mutation = useMutation({
 *   mutationFn: (data) => api.post('/bookings', data),
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: ['bookings'] })
 *     queryClient.invalidateQueries({ queryKey: ['rooms'] })
 *   }
 * })
 * 
 * // After:
 * const mutation = useMutationWithInvalidation({
 *   mutationFn: (data) => api.post('/bookings', data),
 *   endpoint: '/bookings', // Automatically invalidates bookings, rooms, available-rooms, dashboard
 *   additionalInvalidations: [['custom-key', 'param']], // Optional: extra query keys to invalidate
 *   onSuccess: () => {
 *     toast.success('Booking created!')
 *   }
 * })
 */
export function useMutationWithInvalidation<TData = any, TVariables = any, TError = Error>(
  options: UseMutationOptions<TData, TError, TVariables> & {
    endpoint: string // Required: the API endpoint being called
    additionalInvalidations?: (string | any[])[] // Optional: additional query keys to invalidate
  }
) {
  const queryClient = useQueryClient()
  const { endpoint, additionalInvalidations, onSuccess, ...mutationOptions } = options

  return useMutation<TData, TError, TVariables>({
    ...mutationOptions,
    onSuccess: async (data, variables, context, mutation) => {
      const relatedKeys = getRelatedQueryKeys(endpoint)
      relatedKeys.forEach((key) => {
        queryClient.invalidateQueries({
          predicate: (query: any) => {
            const qk = query?.queryKey
            return Array.isArray(qk) && qk.length > 0 && qk[0] === key
          },
        })
      })

      if (additionalInvalidations && additionalInvalidations.length > 0) {
        for (const key of additionalInvalidations) {
          if (Array.isArray(key)) {
            await queryClient.invalidateQueries({ queryKey: key })
          } else {
            await queryClient.invalidateQueries({ queryKey: [key] })
          }
        }
      }

      // Refetch related queries so Rooms/list update even when user navigates later
      for (const key of relatedKeys) {
        await queryClient.refetchQueries({
          predicate: (query: any) => {
            const qk = query?.queryKey
            return Array.isArray(qk) && qk.length > 0 && qk[0] === key
          },
        })
      }
      
      // Call custom onSuccess if provided
      if (onSuccess) {
        onSuccess(data, variables, context, mutation)
      }
    },
  })
}
