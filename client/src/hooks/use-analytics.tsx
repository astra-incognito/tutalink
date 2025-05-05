import { useCallback } from 'react';
import { trackUserActivity, trackSearch, trackError } from '@/lib/analytics';

/**
 * Hook for tracking analytics in functional components
 * @returns Object with tracking methods
 */
export function useAnalytics() {
  // Track user interactions like button clicks, form submissions, etc.
  const trackActivity = useCallback((
    action: string,
    targetId?: number | null,
    targetType?: string | null,
    metadata: any = {}
  ) => {
    return trackUserActivity(action, targetId || null, targetType || null, metadata);
  }, []);

  // Track search queries and results
  const trackSearchQuery = useCallback((
    searchTerm: string,
    resultCount: number,
    filters: any = {},
    clickedResult?: number | null
  ) => {
    return trackSearch(searchTerm, resultCount, filters, clickedResult || null);
  }, []);

  // Track specific errors
  const trackClientError = useCallback((
    errorType: string,
    errorMessage: string,
    stackTrace?: string | null
  ) => {
    return trackError(errorType, errorMessage, window.location.href, stackTrace || null);
  }, []);

  return {
    trackActivity,
    trackSearchQuery,
    trackClientError
  };
}