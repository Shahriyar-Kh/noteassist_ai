// FILE: src/utils/requestDeduplication.js
// ============================================================================
// Request deduplication utility - Prevent duplicate simultaneous API calls
// ============================================================================

/**
 * Deduplicates requests based on URL and parameters
 * Multiple calls to the same endpoint within a time window
 * will only execute once, with all requesters getting the same result
 */
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
    this.retentionTime = 5000; // 5 seconds
  }

  /**
   * Generate a unique key for request deduplication
   * @param {string} url - API endpoint
   * @param {object} params - Request parameters
   * @returns {string} Unique key
   */
  generateKey(url, params = null) {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}::${paramString}`;
  }

  /**
   * Execute deduplicated request
   * @param {string} url - API endpoint
   * @param {function} requestFn - Function that returns a promise
   * @param {object} params - Request parameters
   * @returns {Promise}
   */
  async execute(url, requestFn, params = null) {
    const key = this.generateKey(url, params);

    // If request already pending, return the existing promise
    if (this.pendingRequests.has(key)) {
      // reuse existing promise
      return this.pendingRequests.get(key);
    }

    // Execute new request
    const promise = requestFn()
      .then((response) => {
        // Keep result in cache for retention time
        setTimeout(() => {
          this.pendingRequests.delete(key);
        }, this.retentionTime);
        return response;
      })
      .catch((error) => {
        // Remove on error immediately
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, promise);

    return promise;
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }

  /**
   * Get count of pending requests (useful for debugging)
   */
  getPendingCount() {
    return this.pendingRequests.size;
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

export default requestDeduplicator;
