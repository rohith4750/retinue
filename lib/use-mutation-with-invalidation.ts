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
 *   onSuccess: () => {
 *     toast.success('Booking created!')
 *   }
 * })
 */
export function useMutationWithInvalidation<TData = any, TVariables = any, TError = Error>(
  options: UseMutationOptions<TData, TError, TVariables> & {
    endpoint: string // Required: the API endpoint being called
  }
) {
  const queryClient = useQueryClient()
  const { endpoint, onSuccess, ...mutationOptions } = options

  return useMutation<TData, TError, TVariables>({
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      // Automatically invalidate all related queries
      invalidateRelatedQueries(queryClient, endpoint)
      
      // Call custom onSuccess if provided
      if (onSuccess) {
        onSuccess(data, variables, context)
      }
    },
  })
}
