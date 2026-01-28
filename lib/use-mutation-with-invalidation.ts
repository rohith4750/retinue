/**
 * Custom hook for mutations with automatic query invalidation
 * This ensures all related queries are invalidated when a mutation succeeds
 * 
 * Usage: Replace useMutation with useMutationWithInvalidation and provide the endpoint
 */

import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { invalidateRelatedQueries } from './query-invalidation'

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
      // Automatically invalidate all related queries
      invalidateRelatedQueries(queryClient, endpoint)
      
      // Invalidate additional query keys if provided
      if (additionalInvalidations && additionalInvalidations.length > 0) {
        for (const key of additionalInvalidations) {
          if (Array.isArray(key)) {
            await queryClient.invalidateQueries({ queryKey: key })
          } else {
            await queryClient.invalidateQueries({ queryKey: [key] })
          }
        }
      }
      
      // Refetch all queries to ensure immediate update
      await queryClient.refetchQueries({ type: 'active' })
      
      // Call custom onSuccess if provided
      if (onSuccess) {
        onSuccess(data, variables, context, mutation)
      }
    },
  })
}
