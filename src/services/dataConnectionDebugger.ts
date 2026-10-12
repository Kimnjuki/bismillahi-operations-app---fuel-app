/**
 * Data Connection Debugger
 * 
 * Provides comprehensive debugging tools to trace data flow from
 * Supabase through the frontend application
 */

import { getQueryLogs } from './centralizedDataService';

interface DataFlowTrace {
  source: 'database' | 'cache' | 'component';
  timestamp: number;
  table: string;
  rowCount: number;
  duration: number;
  success: boolean;
  error?: string;
}

class DataConnectionDebugger {
  private traces: DataFlowTrace[] = [];
  private readonly MAX_TRACES = 500;

  /**
   * Log a data flow trace
   */
  trace(
    source: 'database' | 'cache' | 'component',
    table: string,
    rowCount: number,
    duration: number,
    success: boolean,
    error?: string
  ) {
    const trace: DataFlowTrace = {
      source,
      timestamp: Date.now(),
      table,
      rowCount,
      duration,
      success,
      error,
    };

    this.traces.push(trace);

    // Keep only recent traces
    if (this.traces.length > this.MAX_TRACES) {
      this.traces = this.traces.slice(-this.MAX_TRACES);
    }

    // Log to console in development
    if (__DEV__) {
      const statusEmoji = success ? '✓' : '✗';
      const sourceColor = {
        database: 'color: #2196F3',
        cache: 'color: #4CAF50',
        component: 'color: #FF9800',
      };

      console.log(
        `%c[${source.toUpperCase()}] ${table}`,
        sourceColor[source],
        `| Rows: ${rowCount} | ${duration}ms | ${success ? 'OK' : 'FAILED'}${error ? ` (${error})` : ''}`
      );
    }
  }

  /**
   * Verify Supabase connection
   */
  async verifyConnection() {
    try {
      const { supabase } = await import('../config/supabase');
      const { data, error } = await supabase.from('users').select('count', { count: 'exact' });

      if (error) {
        console.error('❌ Supabase connection failed:', error);
        return {
          connected: false,
          error: error.message,
        };
      }

      console.log('✓ Supabase connection verified');
      return {
        connected: true,
        error: null,
      };
    } catch (error) {
      console.error('❌ Connection verification error:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get data retrieval summary
   */
  getSummary() {
    const summary = {
      totalTraces: this.traces.length,
      successful: this.traces.filter(t => t.success).length,
      failed: this.traces.filter(t => !t.success).length,
      totalRowsRetrieved: this.traces.reduce((sum, t) => sum + t.rowCount, 0),
      averageQueryTime: Math.round(
        this.traces.filter(t => t.source === 'database').reduce((sum, t) => sum + t.duration, 0) /
          Math.max(1, this.traces.filter(t => t.source === 'database').length)
      ),
      cacheHitRate: this.traces.filter(t => t.source === 'cache').length / Math.max(1, this.traces.length),
      tables: Array.from(new Set(this.traces.map(t => t.table))).sort(),
    };

    return summary;
  }

  /**
   * Get traces filtered by table
   */
  getTracesByTable(table: string) {
    return this.traces.filter(t => t.table === table);
  }

  /**
   * Get failed queries
   */
  getFailedQueries() {
    return this.traces.filter(t => !t.success);
  }

  /**
   * Get recent traces (last N)
   */
  getRecentTraces(count: number = 20) {
    return this.traces.slice(-count);
  }

  /**
   * Export traces as JSON
   */
  exportTraces() {
    return {
      traces: this.traces,
      timestamp: new Date().toISOString(),
      summary: this.getSummary(),
    };
  }

  /**
   * Check data consistency between frontend and backend
   */
  async checkDataConsistency(table: string) {
    try {
      const { supabase } = await import('../config/supabase');
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });

      if (error) {
        console.error(`❌ Error checking ${table}:`, error);
        return { consistent: false, error: error.message };
      }

      const stats = {
        table,
        totalRows: count,
        sampledRows: data?.length || 0,
        timestamp: new Date().toISOString(),
        consistent: count === data?.length,
      };

      console.log(`✓ Data consistency check for ${table}:`, stats);
      return stats;
    } catch (error) {
      console.error(`❌ Consistency check error for ${table}:`, error);
      return {
        consistent: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate table schema
   */
  async validateTableSchema(table: string, expectedFields: string[]) {
    try {
      const { supabase } = await import('../config/supabase');
      const { data, error } = await supabase.from(table).select().limit(1);

      if (error) {
        console.error(`❌ Error validating ${table}:`, error);
        return { valid: false, error: error.message };
      }

      if (!data || data.length === 0) {
        console.warn(`⚠️ No data in ${table} to validate schema`);
        return { valid: true, warning: 'No data to validate' };
      }

      const actualFields = Object.keys(data[0]);
      const missingFields = expectedFields.filter(f => !actualFields.includes(f));
      const extraFields = actualFields.filter(f => !expectedFields.includes(f));

      const valid = missingFields.length === 0;

      if (valid) {
        console.log(`✓ Schema validation passed for ${table}`);
      } else {
        console.warn(`⚠️ Schema mismatch in ${table}:`, {
          missing: missingFields,
          extra: extraFields,
        });
      }

      return {
        valid,
        table,
        expectedFields,
        actualFields,
        missingFields,
        extraFields,
      };
    } catch (error) {
      console.error(`❌ Schema validation error for ${table}:`, error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run comprehensive diagnostics
   */
  async runDiagnostics() {
    console.log('🔍 Starting data connection diagnostics...\n');

    const connection = await this.verifyConnection();
    const summary = this.getSummary();
    const failed = this.getFailedQueries();

    const diagnostics = {
      timestamp: new Date().toISOString(),
      connection,
      summary,
      failedQueries: failed,
      recommendations: this.generateRecommendations(connection, summary, failed),
    };

    console.log('\n📊 Diagnostics Summary:');
    console.table(diagnostics.summary);

    if (diagnostics.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      diagnostics.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }

    return diagnostics;
  }

  /**
   * Generate recommendations based on diagnostics
   */
  private generateRecommendations(
    connection: any,
    summary: any,
    failed: DataFlowTrace[]
  ): string[] {
    const recommendations: string[] = [];

    if (!connection.connected) {
      recommendations.push('✗ Supabase connection failed - check URL and API key');
    }

    if (summary.failed > 0) {
      recommendations.push(`✗ ${summary.failed} failed queries detected - check query syntax and permissions`);
    }

    if (summary.averageQueryTime > 1000) {
      recommendations.push(
        `✗ Slow queries detected (avg ${summary.averageQueryTime}ms) - consider adding indexes or limiting result set`
      );
    }

    if (summary.cacheHitRate < 0.3) {
      recommendations.push('✗ Low cache hit rate - consider increasing cache TTL or using materialized views');
    }

    if (failed.length > 0) {
      failed.forEach(f => {
        if (f.error?.includes('401') || f.error?.includes('403')) {
          recommendations.push(`✗ Permission error on ${f.table} - check RLS policies`);
        }
        if (f.error?.includes('404')) {
          recommendations.push(`✗ Table ${f.table} not found - verify table name and schema`);
        }
      });
    }

    if (recommendations.length === 0) {
      recommendations.push('✓ All checks passed - data connection is healthy');
    }

    return recommendations;
  }

  /**
   * Clear all traces
   */
  clearTraces() {
    this.traces = [];
    console.log('Traces cleared');
  }

  /**
   * Get detailed report
   */
  getDetailedReport() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getSummary(),
      recentTraces: this.getRecentTraces(50),
      queryLogs: getQueryLogs(),
      failedQueries: this.getFailedQueries(),
    };
  }
}

export const dataConnectionDebugger = new DataConnectionDebugger();

// Export for use in development tools
if (__DEV__) {
  (global as any).debugDataConnection = dataConnectionDebugger;
}
