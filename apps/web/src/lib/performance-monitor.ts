/**
 * Performance monitoring utilities for tracking chat history load times
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private activeTimers = new Map<string, number>();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTimer(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.activeTimers.set(name, startTime);
    
    if (process.env.NODE_ENV === 'development') {
      // Development timing only
    }
  }

  /**
   * End timing an operation and record the metric
   */
  endTimer(name: string, metadata?: Record<string, any>): number {
    const startTime = this.activeTimers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.activeTimers.delete(name);

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    if (process.env.NODE_ENV === 'development') {
      // Development logging only - use browser dev tools for detailed timing
    }

    return duration;
  }

  /**
   * Get performance metrics for analysis
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * Get average duration for a specific metric
   */
  getAverageDuration(name: string): number {
    const matching = this.getMetrics(name);
    if (matching.length === 0) return 0;
    
    const total = matching.reduce((sum, m) => sum + m.duration, 0);
    return total / matching.length;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.activeTimers.clear();
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    const report = ['🚀 Performance Report', '=================='];
    
    const metricsByName = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);

    Object.entries(metricsByName).forEach(([name, metrics]) => {
      const avg = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      const min = Math.min(...metrics.map(m => m.duration));
      const max = Math.max(...metrics.map(m => m.duration));
      
      report.push(`${name}:`);
      report.push(`  Count: ${metrics.length}`);
      report.push(`  Average: ${avg.toFixed(2)}ms`);
      report.push(`  Min: ${min.toFixed(2)}ms`);
      report.push(`  Max: ${max.toFixed(2)}ms`);
      report.push('');
    });

    return report.join('\n');
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Decorator for timing async functions
 */
export function timed(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const timerName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.startTimer(timerName);
      try {
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        performanceMonitor.endTimer(timerName);
      }
    };

    return descriptor;
  };
}

/**
 * Utility for timing code blocks
 */
export async function timeAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  performanceMonitor.startTimer(name, metadata);
  try {
    const result = await fn();
    return result;
  } finally {
    performanceMonitor.endTimer(name, metadata);
  }
}