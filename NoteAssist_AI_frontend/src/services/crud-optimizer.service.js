// FILE: src/services/crud-optimizer.service.js
// ============================================================================
// ⚡ CRUD Operations Optimizer - Wraps all create/update/delete with:
// - Automatic loading states
// - Error handling
// - Toast notifications
// - Request deduplication
// ============================================================================

import api from './api';
import { requestDeduplicator } from '@/utils/requestDeduplication';
import { showToast } from '@/components/common/Toast';
import logger from '@/utils/logger';

/**
 * Optimized CRUD operation wrapper
 * Provides consistent handling across all CRUD operations
 */
export const crudOptimizer = {
  /**
   * Execute CREATE operation with automatic feedback
   * @param {string} endpoint - API endpoint
   * @param {object} data - Data to create
   * @param {object} options - { successMessage, errorMessage }
   * @returns {Promise}
   */
  async create(endpoint, data, options = {}) {
    const { successMessage = 'Created successfully ✓', errorMessage = 'Failed to create' } = options;

    try {
      const response = await api.post(endpoint, data);
      showToast.success(successMessage);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || errorMessage;
      showToast.error(msg);
      throw error;
    }
  },

  /**
   * Execute UPDATE operation with automatic feedback
   * @param {string} endpoint - API endpoint
   * @param {object} data - Data to update
   * @param {object} options - { successMessage, errorMessage }
   * @returns {Promise}
   */
  async update(endpoint, data, options = {}) {
    const { successMessage = 'Updated successfully ✓', errorMessage = 'Failed to update' } = options;

    try {
      // Invalidate deduplication cache for this resource
      requestDeduplicator.clear();

      const response = await api.patch(endpoint, data);
      showToast.success(successMessage);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || errorMessage;
      showToast.error(msg);
      throw error;
    }
  },

  /**
   * Execute DELETE operation with automatic feedback
   * @param {string} endpoint - API endpoint
   * @param {object} options - { successMessage, errorMessage, confirmMessage }
   * @returns {Promise}
   */
  async delete(endpoint, options = {}) {
    const {
      successMessage = 'Deleted successfully ✓',
      errorMessage = 'Failed to delete',
      confirmMessage = 'Are you sure?'
    } = options;

    // Confirmation dialog
    if (!window.confirm(confirmMessage)) {
      return null;
    }

    try {
      // Invalidate deduplication cache for this resource
      requestDeduplicator.clear();

      const response = await api.delete(endpoint);
      showToast.success(successMessage);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || errorMessage;
      showToast.error(msg);
      throw error;
    }
  },

  /**
   * Execute GET operation with deduplication
   * @param {string} endpoint - API endpoint
   * @param {object} params - Query parameters
   * @returns {Promise}
   */
  async get(endpoint, params = {}) {
    try {
      return requestDeduplicator.execute(endpoint, () => api.get(endpoint, { params }), params)
        .then((response) => response.data);
    } catch (error) {
      logger.error('GET request failed:', String(error));
      throw error;
    }
  },

  /**
   * Batch create multiple items
   * @param {string} endpoint - API endpoint
   * @param {array} items - Array of items to create
   * @param {object} options - Configuration options
   * @returns {Promise<array>}
   */
  async batchCreate(endpoint, items, options = {}) {
    const {
      successMessage = 'All items created successfully ✓',
      errorMessage = 'Some items failed to create',
      onProgress = null
    } = options;

    const results = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const result = await api.post(endpoint, items[i]);
        results.push(result.data);

        if (onProgress) {
          onProgress(Math.round(((i + 1) / items.length) * 100));
        }
      } catch (error) {
        errors.push({
          index: i,
          item: items[i],
          error: error.response?.data?.error || error.message
        });
      }
    }

    if (errors.length === 0) {
      showToast.success(successMessage);
    } else if (results.length === 0) {
      showToast.error(errorMessage);
    } else {
      showToast.warning(`${results.length} created, ${errors.length} failed`);
    }

    return { results, errors, success: errors.length === 0 };
  },
};

export default crudOptimizer;
