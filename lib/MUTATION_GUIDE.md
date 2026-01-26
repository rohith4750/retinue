# Global Query Invalidation Guide

This project uses a **global query invalidation strategy** to automatically update all related queries when mutations succeed. This ensures data consistency across the entire application without manual invalidation.

## How It Works

When a mutation succeeds, the system automatically invalidates all related queries based on the API endpoint. This means:

- ✅ No need to manually invalidate queries in each mutation
- ✅ All related data updates immediately
- ✅ Consistent behavior across the entire app
- ✅ Zero lag between mutations and UI updates

## Usage

### Option 1: Use `useMutationWithInvalidation` (Recommended)

Replace `useMutation` with `useMutationWithInvalidation` and provide the endpoint:

```typescript
import { useMutationWithInvalidation } from '@/lib/use-mutation-with-invalidation'

// Before (manual invalidation):
const mutation = useMutation({
  mutationFn: (data) => api.post('/bookings', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
    queryClient.invalidateQueries({ queryKey: ['available-rooms'] })
  }
})

// After (automatic invalidation):
const mutation = useMutationWithInvalidation({
  mutationFn: (data) => api.post('/bookings', data),
  endpoint: '/bookings', // Automatically invalidates all related queries
  onSuccess: () => {
    toast.success('Booking created!')
  }
})
```

### Option 2: Keep `useMutation` and manually invalidate

You can still use regular `useMutation` if you need more control, but you'll need to manually invalidate queries.

## Query Invalidation Map

The system knows which queries to invalidate based on the endpoint:

| Endpoint | Invalidated Queries |
|----------|-------------------|
| `/bookings` | `bookings`, `rooms`, `available-rooms`, `dashboard` |
| `/bookings/{id}` | `bookings`, `rooms`, `available-rooms`, `dashboard` |
| `/rooms` | `rooms`, `available-rooms`, `dashboard` |
| `/rooms/{id}` | `rooms`, `available-rooms`, `dashboard` |
| `/inventory` | `inventory`, `dashboard` |
| `/staff` | `staff`, `dashboard` |
| `/bills/{id}` | `bills`, `bill`, `bookings`, `dashboard` |

## Adding New Endpoints

To add automatic invalidation for a new endpoint, update `lib/query-invalidation.ts`:

```typescript
export const QUERY_INVALIDATION_MAP: QueryInvalidationMap = {
  // ... existing mappings
  '/your-endpoint': ['query-key-1', 'query-key-2', 'dashboard'],
}
```

## Benefits

1. **Immediate Updates**: All related queries update instantly after mutations
2. **No Manual Work**: No need to remember which queries to invalidate
3. **Consistency**: Same behavior everywhere in the app
4. **Maintainability**: Centralized invalidation logic

## Examples

### Creating a Booking
```typescript
const createMutation = useMutationWithInvalidation({
  mutationFn: (data) => api.post('/bookings', data),
  endpoint: '/bookings',
  onSuccess: () => {
    toast.success('Booking created!')
    router.push('/bookings')
  }
})
```

### Updating a Room
```typescript
const updateMutation = useMutationWithInvalidation({
  mutationFn: (data) => api.put(`/rooms/${room.id}`, data),
  endpoint: '/rooms/',
  onSuccess: () => {
    toast.success('Room updated!')
    onClose()
  }
})
```

### Deleting a Room
```typescript
const deleteMutation = useMutationWithInvalidation({
  mutationFn: (id) => api.delete(`/rooms/${id}`),
  endpoint: '/rooms/',
  onSuccess: () => {
    toast.success('Room deleted!')
  }
})
```

## Migration

To migrate existing mutations:

1. Import `useMutationWithInvalidation` instead of `useMutation`
2. Add `endpoint` property to mutation options
3. Remove manual `queryClient.invalidateQueries` calls
4. Keep your custom `onSuccess` logic (toasts, navigation, etc.)
