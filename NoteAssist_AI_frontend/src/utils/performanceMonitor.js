// FILE: src/utils/performanceMonitor.js
// ============================================================================
// ⚡ PERFORMANCE MONITORING SYSTEM
// Track slow operations, API response times, and component render times
// ============================================================================

class PerformanceMonitor {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.slowThreshold = options.slowThreshold || 1000; // ms
    this.metrics = new Map();
    this.apiMetrics = new Map();
    this.componentMetrics = new Map();
    this.alerts = [];
    this.maxAlerts = options.maxAlerts || 50;
  }

  /**
   * Track API request timing
   */
  trackApiCall(endpoint, method, startTime, duration, status, cached = false) {
    if (!this.enabled) return;

    const key = `${method.toUpperCase()} ${endpoint}`;
    
    if (!this.apiMetrics.has(key)) {
      this.apiMetrics.set(key, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        slowCount: 0,
        errors: 0,
        cachedCount: 0,
      });
    }

    const metric = this.apiMetrics.get(key);
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    
    if (duration > this.slowThreshold) {
      metric.slowCount++;
      this.recordAlert({
        type: 'slow-api',
        endpoint,
        duration,
        threshold: this.slowThreshold,
      });
    }

    if (status >= 400) {
      metric.errors++;
    }

    if (cached) {
      metric.cachedCount++;
    }

    return {
      avgTime: Math.round(metric.totalTime / metric.count),
      slowPercent: Math.round((metric.slowCount / metric.count) * 100),
    };
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName, duration, phase = 'mount') {
    if (!this.enabled) return;

    const key = `${componentName}::${phase}`;
    
    if (!this.componentMetrics.has(key)) {
      this.componentMetrics.set(key, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
      });
    }

    const metric = this.componentMetrics.get(key);
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.avgTime = Math.round(metric.totalTime / metric.count);

    if (duration > this.slowThreshold && phase === 'mount') {
      this.recordAlert({
        type: 'slow-component',
        component: componentName,
        duration,
        phase,
        threshold: this.slowThreshold,
      });
    }
  }

  /**
   * Record a performance alert
   */
  recordAlert(alert) {
    this.alerts.push({
      ...alert,
      timestamp: new Date(),
    });

    // Keep only maxAlerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ Performance Alert:`, alert);
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return {
      apiMetrics: Object.fromEntries(this.apiMetrics),
      componentMetrics: Object.fromEntries(this.componentMetrics),
      alerts: this.alerts,
    };
  }

  /**
   * Get slow APIs
   */
  getSlowApis(limit = 5) {
    const slow = Array.from(this.apiMetrics.entries())
      .map(([key, metric]) => ({
        endpoint: key,
        ...metric,
        avgTime: Math.round(metric.totalTime / metric.count),
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);

    return slow;
  }

  /**
   * Clear metrics
   */
  clear() {
    this.metrics.clear();
    this.apiMetrics.clear();
    this.componentMetrics.clear();
    this.alerts = [];
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalApiCalls: Array.from(this.apiMetrics.values()).reduce((sum, m) => sum + m.count, 0),
      slowApiCalls: Array.from(this.apiMetrics.values()).reduce((sum, m) => sum + m.slowCount, 0),
      totalErrors: Array.from(this.apiMetrics.values()).reduce((sum, m) => sum + m.errors, 0),
      cachedCalls: Array.from(this.apiMetrics.values()).reduce((sum, m) => sum + m.cachedCount, 0),
      slowestEndpoints: this.getSlowApis(5),
      recentAlerts: this.alerts.slice(-10),
    };

    return report;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor({
  enabled: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
  slowThreshold: 1000,
});

export default performanceMonitor;
