import { apiRequest } from "./queryClient";

// Analytics utility functions

/**
 * Tracks a page view for analytics
 * @param path The page path or route
 * @param duration Optional time spent on page in seconds
 * @param queryParams Optional URL query parameters
 * @param referrer Optional referring URL
 */
export async function trackPageView(
  path: string,
  duration: number | null = null,
  queryParams: string | null = null,
  referrer: string | null = null
): Promise<void> {
  try {
    await apiRequest("POST", "/api/analytics/page-view", {
      path,
      duration,
      queryParams,
      referrer
    });
  } catch (error) {
    console.error("Failed to track page view:", error);
  }
}

/**
 * Tracks user activity for analytics
 * @param action The action that was performed
 * @param targetId Optional ID of the target object
 * @param targetType Optional type of the target object
 * @param metadata Optional additional data
 */
export async function trackUserActivity(
  action: string,
  targetId: number | null = null,
  targetType: string | null = null,
  metadata: any = {}
): Promise<void> {
  try {
    await apiRequest("POST", "/api/analytics/user-activity", {
      action,
      targetId,
      targetType,
      metadata
    });
  } catch (error) {
    console.error("Failed to track user activity:", error);
  }
}

/**
 * Tracks search queries for analytics
 * @param searchTerm The search term
 * @param resultCount Number of results found
 * @param filters Optional filters applied to the search
 * @param clickedResult Optional ID of the result that was clicked
 */
export async function trackSearch(
  searchTerm: string,
  resultCount: number,
  filters: any = {},
  clickedResult: number | null = null
): Promise<void> {
  try {
    await apiRequest("POST", "/api/analytics/search", {
      searchTerm,
      resultCount,
      filters,
      clickedResult
    });
  } catch (error) {
    console.error("Failed to track search:", error);
  }
}

/**
 * Tracks client-side errors for analytics
 * @param errorType Type of error
 * @param errorMessage Error message
 * @param url URL where the error occurred
 * @param stackTrace Optional stack trace
 */
export async function trackError(
  errorType: string,
  errorMessage: string,
  url: string,
  stackTrace: string | null = null
): Promise<void> {
  try {
    await apiRequest("POST", "/api/analytics/error", {
      errorType,
      errorMessage,
      url,
      stackTrace
    });
  } catch (error) {
    console.error("Failed to track error:", error);
  }
}

/**
 * Globally catches and reports unhandled JavaScript errors
 */
export function setupErrorTracking(): void {
  window.addEventListener('error', (event) => {
    trackError(
      'unhandledError',
      event.message || 'Unknown error',
      window.location.href,
      event.error?.stack || null
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackError(
      'unhandledPromiseRejection',
      event.reason?.message || 'Unhandled promise rejection',
      window.location.href,
      event.reason?.stack || null
    );
  });
}