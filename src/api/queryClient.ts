import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';

/**
 * Single app-wide QueryClient. Note `apiFetch` already handles 401 →
 * token-refresh → retry internally, so React Query never needs to retry auth
 * failures; we only retry transient 5xx/network errors.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false, // not meaningful on React Native
    },
    mutations: { retry: false },
  },
});
