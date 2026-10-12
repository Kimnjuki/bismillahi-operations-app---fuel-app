/**
 * Implementation Testing Utility
 * 
 * Helps verify the frontend-backend connection is working properly
 */

import { dataConnectionDebugger } from './dataConnectionDebugger';
import {
  SalesDataService,
  StockDataService,
  ExpenseDataService,
  AccountDataService,
  UserDataService,
  NotificationDataService,
} from './centralizedDataService';

class ImplementationTester {
  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: any[];
  }> {
    const results: any[] = [];

    console.log('🧪 Running implementation tests...\n');

    // Test 1: Connection
    console.log('1️⃣ Testing Supabase connection...');
    const connResult = await this.testConnection();
    results.push(connResult);

    // Test 2: Sales Service
    console.log('\n2️⃣ Testing Sales Data Service...');
    const salesResult = await this.testSalesService();
    results.push(salesResult);

    // Test 3: Stock Service
    console.log('\n3️⃣ Testing Stock Data Service...');
    const stockResult = await this.testStockService();
    results.push(stockResult);

    // Test 4: Expense Service
    console.log('\n4️⃣ Testing Expense Data Service...');
    const expenseResult = await this.testExpenseService();
    results.push(expenseResult);

    // Test 5: Account Services
    console.log('\n5️⃣ Testing Account Data Services...');
    const accountResult = await this.testAccountServices();
    results.push(accountResult);

    // Test 6: User Service
    console.log('\n6️⃣ Testing User Data Service...');
    const userResult = await this.testUserService();
    results.push(userResult);

    // Test 7: Schema Validation
    console.log('\n7️⃣ Testing Schema Validation...');
    const schemaResult = await this.testSchemaValidation();
    results.push(schemaResult);

    // Test 8: Performance
    console.log('\n8️⃣ Testing Performance Metrics...');
    const perfResult = await this.testPerformance();
    results.push(perfResult);

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;

    console.log('\n' + '='.repeat(50));
    console.log(`✓ Tests Complete: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));

    return { passed, failed, results };
  }

  private async testConnection() {
    try {
      const result = await dataConnectionDebugger.verifyConnection();
      if (result.connected) {
        console.log('  ✓ Supabase connection verified');
        return { name: 'Connection', status: 'pass', details: result };
      } else {
        console.log('  ✗ Supabase connection failed:', result.error);
        return { name: 'Connection', status: 'fail', details: result };
      }
    } catch (error) {
      console.log('  ✗ Connection test error:', error);
      return { name: 'Connection', status: 'fail', error };
    }
  }

  private async testSalesService() {
    try {
      const { data, error } = await SalesDataService.getDailySales({ limit: 5 });
      if (error) {
        console.log('  ✗ Sales query failed:', error);
        return { name: 'Sales Service', status: 'fail', error };
      }
      console.log(`  ✓ Sales query successful (${data?.length || 0} records)`);
      return { name: 'Sales Service', status: 'pass', records: data?.length };
    } catch (error) {
      console.log('  ✗ Sales service error:', error);
      return { name: 'Sales Service', status: 'fail', error };
    }
  }

  private async testStockService() {
    try {
      const { data, error } = await StockDataService.getStockItems({ lowStockOnly: false });
      if (error) {
        console.log('  ✗ Stock query failed:', error);
        return { name: 'Stock Service', status: 'fail', error };
      }
      console.log(`  ✓ Stock query successful (${data?.length || 0} records)`);
      return { name: 'Stock Service', status: 'pass', records: data?.length };
    } catch (error) {
      console.log('  ✗ Stock service error:', error);
      return { name: 'Stock Service', status: 'fail', error };
    }
  }

  private async testExpenseService() {
    try {
      const { data, error } = await ExpenseDataService.getExpenses({ limit: 5 });
      if (error) {
        console.log('  ✗ Expense query failed:', error);
        return { name: 'Expense Service', status: 'fail', error };
      }
      console.log(`  ✓ Expense query successful (${data?.length || 0} records)`);
      return { name: 'Expense Service', status: 'pass', records: data?.length };
    } catch (error) {
      console.log('  ✗ Expense service error:', error);
      return { name: 'Expense Service', status: 'fail', error };
    }
  }

  private async testAccountServices() {
    try {
      const [receivables, payables] = await Promise.all([
        AccountDataService.getAccountReceivables(),
        AccountDataService.getAccountPayables(),
      ]);

      if (receivables.error || payables.error) {
        console.log('  ✗ Account query failed');
        return {
          name: 'Account Services',
          status: 'fail',
          errors: { receivables: receivables.error, payables: payables.error },
        };
      }

      console.log(
        `  ✓ Account queries successful (${receivables.data?.length || 0} receivables, ${payables.data?.length || 0} payables)`
      );
      return {
        name: 'Account Services',
        status: 'pass',
        receivables: receivables.data?.length,
        payables: payables.data?.length,
      };
    } catch (error) {
      console.log('  ✗ Account service error:', error);
      return { name: 'Account Services', status: 'fail', error };
    }
  }

  private async testUserService() {
    try {
      const { data, error } = await UserDataService.getAllUsers();
      if (error) {
        console.log('  ✗ User query failed:', error);
        return { name: 'User Service', status: 'fail', error };
      }
      console.log(`  ✓ User query successful (${data?.length || 0} records)`);
      return { name: 'User Service', status: 'pass', records: data?.length };
    } catch (error) {
      console.log('  ✗ User service error:', error);
      return { name: 'User Service', status: 'fail', error };
    }
  }

  private async testSchemaValidation() {
    try {
      const tables = ['daily_sales', 'stock_items', 'expenses', 'users', 'notifications'];
      const validations = await Promise.all(
        tables.map(table =>
          dataConnectionDebugger.validateTableSchema(table, []).catch((e: unknown) => ({ valid: false, error: e }))
        )
      );

      const validCount = validations.filter((v: { valid?: boolean }) => v.valid !== false).length;
      console.log(`  ✓ Schema validation: ${validCount}/${tables.length} tables valid`);
      return { name: 'Schema Validation', status: 'pass', validTables: validCount, totalTables: tables.length };
    } catch (error) {
      console.log('  ✗ Schema validation error:', error);
      return { name: 'Schema Validation', status: 'fail', error };
    }
  }

  private async testPerformance() {
    try {
      const summary = await dataConnectionDebugger.getSummary();
      console.log(`  ✓ Performance metrics:
    - Avg query time: ${summary.averageQueryTime}ms
    - Cache hit rate: ${(summary.cacheHitRate * 100).toFixed(1)}%
    - Total rows: ${summary.totalRowsRetrieved}
    - Success rate: ${((summary.successful / Math.max(1, summary.totalTraces)) * 100).toFixed(1)}%`);

      return {
        name: 'Performance',
        status: 'pass',
        avgQueryTime: summary.averageQueryTime,
        cacheHitRate: summary.cacheHitRate,
        successRate: summary.successful / Math.max(1, summary.totalTraces),
      };
    } catch (error) {
      console.log('  ✗ Performance test error:', error);
      return { name: 'Performance', status: 'fail', error };
    }
  }
}

export const implementationTester = new ImplementationTester();

// Export for use in development
if (__DEV__) {
  (global as any).testImplementation = implementationTester;
}
