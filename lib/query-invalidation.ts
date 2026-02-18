/**
 * Global query invalidation strategy
 * Maps API endpoints to related query keys that should be invalidated
 */

export interface QueryInvalidationMap {
  [endpoint: string]: string[];
}

/**
 * Maps API endpoints to their related query keys
 * When a mutation succeeds, all related queries are automatically invalidated
 */
export const QUERY_INVALIDATION_MAP: QueryInvalidationMap = {
  // Bookings - affects rooms, calendar, and dashboard
  "/bookings": [
    "bookings",
    "booking",
    "bookings-calendar",
    "rooms",
    "available-rooms",
    "dashboard",
  ],
  "/bookings/": [
    "bookings",
    "booking",
    "bookings-calendar",
    "rooms",
    "available-rooms",
    "dashboard",
  ], // Matches /bookings/{id}

  // Rooms - affects availability
  "/rooms": ["rooms", "available-rooms", "dashboard"],
  "/rooms/": ["rooms", "available-rooms", "dashboard"], // Matches /rooms/{id}

  // Inventory
  "/inventory": ["inventory", "dashboard"],
  "/inventory/": ["inventory", "dashboard"],

  // Staff - affects dashboard counts
  "/staff": ["staff", "dashboard"],
  "/staff/": ["staff", "dashboard"], // Matches /staff/{id}

  // Bills - affects bookings and dashboard
  "/bills": ["bills", "bill", "bookings", "dashboard"],
  "/bills/": ["bills", "bill", "bookings", "dashboard"], // Matches /bills/{id}

  // Function Halls
  "/function-halls": [
    "function-halls",
    "function-halls-available",
    "dashboard",
  ],
  "/function-halls/": [
    "function-halls",
    "function-halls-available",
    "dashboard",
  ], // Matches /function-halls/{id}

  // Function Hall Bookings
  "/function-hall-bookings": [
    "function-hall-bookings",
    "function-halls",
    "dashboard",
  ],
  "/function-hall-bookings/": [
    "function-hall-bookings",
    "function-halls",
    "dashboard",
  ], // Matches /function-hall-bookings/{id}

  // Expenses
  "/expenses": ["expenses", "expenses-summary", "dashboard"],
  "/expenses/": ["expenses", "expenses-summary", "dashboard"],

  // Salary Payments
  "/salary-payments": ["salary-payments", "expenses", "staff", "dashboard"],
  "/salary-payments/": ["salary-payments", "expenses", "staff", "dashboard"],

  // Asset Locations
  "/asset-locations": [
    "asset-locations",
    "inventory",
    "rooms",
    "function-halls",
  ],
  "/asset-locations/": [
    "asset-locations",
    "inventory",
    "rooms",
    "function-halls",
  ],

  // Bank Accounts
  "/bank-accounts": ["bank-accounts", "bank-account-detail", "dashboard"],
  "/bank-accounts/": ["bank-accounts", "bank-account-detail", "dashboard"],
};

/**
 * Get related query keys for an endpoint
 */
export function getRelatedQueryKeys(endpoint: string): string[] {
  const keys: string[] = [];

  // Check exact matches first
  if (QUERY_INVALIDATION_MAP[endpoint]) {
    keys.push(...QUERY_INVALIDATION_MAP[endpoint]);
  }

  // Check prefix matches (e.g., /bookings/123 matches /bookings/)
  for (const [pattern, relatedKeys] of Object.entries(QUERY_INVALIDATION_MAP)) {
    if (pattern.endsWith("/") && endpoint.startsWith(pattern)) {
      keys.push(...relatedKeys);
    }
  }

  // Remove duplicates
  return Array.from(new Set(keys));
}

/**
 * Invalidate all related queries for an endpoint
 * Uses partial matching to invalidate queries that START with the key
 * e.g., invalidating 'bookings' will also invalidate ['bookings', 1, 'search']
 */
export function invalidateRelatedQueries(
  queryClient: any,
  endpoint: string,
): void {
  const relatedKeys = getRelatedQueryKeys(endpoint);

  relatedKeys.forEach((key) => {
    // Use predicate to match any query that starts with this key
    queryClient.invalidateQueries({
      predicate: (query: any) => {
        const queryKey = query.queryKey;
        if (Array.isArray(queryKey) && queryKey.length > 0) {
          return queryKey[0] === key;
        }
        return false;
      },
    });
  });
}
