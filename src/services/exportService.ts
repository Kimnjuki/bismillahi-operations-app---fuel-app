import { supabase } from '../config/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert } from 'react-native';

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'json';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  dataTypes: ('sales' | 'expenses' | 'stock' | 'transfers')[];
  includeDetails?: boolean;
}

export interface ExportData {
  sales: any[];
  expenses: any[];
  stock: any[];
  transfers: any[];
  summary: {
    totalSales: number;
    totalExpenses: number;
    netProfit: number;
    transactionCount: number;
  };
}

class ExportService {
  async exportData(options: ExportOptions): Promise<string> {
    try {
      const data = await this.fetchExportData(options);
      
      switch (options.format) {
        case 'csv':
          return await this.exportToCSV(data, options);
        case 'pdf':
          return await this.exportToPDF(data, options);
        case 'json':
          return await this.exportToJSON(data, options);
        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  private async fetchExportData(options: ExportOptions): Promise<ExportData> {
    const { dateRange, dataTypes } = options;
    const { startDate, endDate } = dateRange;
    const data: ExportData = {
      sales: [],
      expenses: [],
      stock: [],
      transfers: [],
      summary: {
        totalSales: 0,
        totalExpenses: 0,
        netProfit: 0,
        transactionCount: 0,
      },
    };

    // Fetch sales data
    if (dataTypes.includes('sales')) {
      const [pumpSales, drumSales] = await Promise.all([
        supabase
          .from('pump_sales')
          .select(`
            *,
            users!pump_sales_created_by_fkey(full_name)
          `)
          .gte('sale_date', startDate)
          .lte('sale_date', endDate)
          .order('sale_date', { ascending: false }),
        supabase
          .from('drum_sales')
          .select(`
            *,
            users!drum_sales_created_by_fkey(full_name)
          `)
          .gte('sale_date', startDate)
          .lte('sale_date', endDate)
          .order('sale_date', { ascending: false }),
      ]);

      data.sales = [
        ...(pumpSales.data || []).map(sale => ({
          ...sale,
          type: 'Pump Sale',
          item: `${sale.fuel_type} - Pump ${sale.pump_number}`,
        })),
        ...(drumSales.data || []).map(sale => ({
          ...sale,
          type: 'Drum Sale',
          item: `${sale.drum_type} - ${sale.quantity} drums`,
        })),
      ];

      data.summary.totalSales = data.sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    }

    // Fetch expenses data
    if (dataTypes.includes('expenses')) {
      const { data: expenses } = await supabase
        .from('expenses')
        .select(`
          *,
          users!expenses_created_by_fkey(full_name)
        `)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false });

      data.expenses = expenses || [];
      data.summary.totalExpenses = data.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    }

    // Fetch stock data
    if (dataTypes.includes('stock')) {
      const { data: stockItems } = await supabase
        .from('stock_items')
        .select(`
          *,
          users!stock_items_updated_by_fkey(full_name)
        `)
        .order('item_name');

      const { data: variances } = await supabase
        .from('stock_variances')
        .select(`
          *,
          stock_items!stock_variances_stock_item_id_fkey(item_name, category),
          users!stock_variances_created_by_fkey(full_name)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      data.stock = [
        ...(stockItems || []),
        ...(variances || [])
      ];
    }

    // Fetch fund transfers
    if (dataTypes.includes('transfers')) {
      const { data: transfers } = await supabase
        .from('fund_transfers')
        .select(`
          *,
          users!fund_transfers_created_by_fkey(full_name)
        `)
        .gte('transfer_date', startDate)
        .lte('transfer_date', endDate)
        .order('transfer_date', { ascending: false });

      data.transfers = transfers || [];
    }

    data.summary.netProfit = data.summary.totalSales - data.summary.totalExpenses;
    data.summary.transactionCount = data.sales.length + data.expenses.length + data.transfers.length;

    return data;
  }

  private async exportToCSV(data: ExportData, options: ExportOptions): Promise<string> {
    const { startDate, endDate } = options.dateRange;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bismillahi-operations-${startDate}-to-${endDate}-${timestamp}.csv`;
    const fileUri = `${filename}`;

    let csvContent = '';

    // Add header
    csvContent += 'Bismillahi Operations Report\n';
    csvContent += `Period: ${startDate} to ${endDate}\n`;
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

    // Add summary
    csvContent += 'SUMMARY\n';
    csvContent += 'Metric,Value\n';
    csvContent += `Total Sales,${data.summary.totalSales}\n`;
    csvContent += `Total Expenses,${data.summary.totalExpenses}\n`;
    csvContent += `Net Profit,${data.summary.netProfit}\n`;
    csvContent += `Total Transactions,${data.summary.transactionCount}\n\n`;

    // Add sales data
    if (data.sales.length > 0) {
      csvContent += 'SALES DATA\n';
      csvContent += 'Type,Item,Volume/Quantity,Price per Unit,Total Amount,Payment Method,Sale Date,Created By\n';
      data.sales.forEach(sale => {
        const volume = sale.type === 'Pump Sale' ? sale.volume_liters : sale.quantity;
        const pricePerUnit = sale.type === 'Pump Sale' ? sale.price_per_liter : sale.price_per_drum;
        csvContent += `${sale.type},${sale.item},${volume},${pricePerUnit},${sale.total_amount},${sale.payment_method},${sale.sale_date},${sale.users?.full_name || 'N/A'}\n`;
      });
      csvContent += '\n';
    }

    // Add expenses data
    if (data.expenses.length > 0) {
      csvContent += 'EXPENSES DATA\n';
      csvContent += 'Category,Subcategory,Amount,Description,Receipt Number,Payment Method,Expense Date,Created By\n';
      data.expenses.forEach(expense => {
        csvContent += `${expense.category},${expense.subcategory || 'N/A'},${expense.amount},${expense.description || 'N/A'},${expense.receipt_number || 'N/A'},${expense.payment_method},${expense.expense_date},${expense.users?.full_name || 'N/A'}\n`;
      });
      csvContent += '\n';
    }

    // Add fund transfers
    if (data.transfers.length > 0) {
      csvContent += 'FUND TRANSFERS\n';
      csvContent += 'From Account,To Account,Amount,Currency,Exchange Rate,Converted Amount,Purpose,Transfer Date,Created By\n';
      data.transfers.forEach(transfer => {
        csvContent += `${transfer.from_account},${transfer.to_account},${transfer.amount},${transfer.currency},${transfer.exchange_rate || 'N/A'},${transfer.converted_amount || 'N/A'},${transfer.purpose || 'N/A'},${transfer.transfer_date},${transfer.users?.full_name || 'N/A'}\n`;
      });
      csvContent += '\n';
    }

    // Add stock data
    if (data.stock && data.stock.length > 0) {
      csvContent += 'STOCK DATA\n';
      csvContent += 'Type,Item Name,Category,Unit,Current Stock,Minimum Stock,Cost Price,Selling Price,Last Updated,Updated By\n';
      data.stock.forEach((item: any) => {
        if (item.item_name) {
          // Stock item
          csvContent += `Item,${item.item_name},${item.category},${item.unit},${item.current_stock},${item.minimum_stock},${item.cost_price},${item.selling_price},${item.last_updated},${item.users?.full_name || 'N/A'}\n`;
        } else if (item.expected_quantity !== undefined) {
          // Stock variance
          csvContent += `Variance,${item.stock_items?.item_name || 'N/A'},${item.stock_items?.category || 'N/A'},${item.stock_items?.unit || 'N/A'},${item.actual_quantity},${item.expected_quantity},${item.variance},${item.reason || 'N/A'},${item.created_at},${item.users?.full_name || 'N/A'}\n`;
        }
      });
      csvContent += '\n';
    }

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: 'utf8' as any,
    });

    return fileUri;
  }

  private async exportToPDF(data: ExportData, options: ExportOptions): Promise<string> {
    const { startDate, endDate } = options.dateRange;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bismillahi-operations-${startDate}-to-${endDate}-${timestamp}.pdf`;

    const html = this.generatePDFHTML(data, options);
    
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  }

  private generatePDFHTML(data: ExportData, options: ExportOptions): string {
    const { startDate, endDate } = options.dateRange;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Bismillahi Operations Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #667eea; margin-bottom: 10px; }
            .header p { color: #666; }
            .section { margin-bottom: 30px; }
            .section h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 5px; }
            .summary { background-color: #f5f5f5; padding: 15px; border-radius: 5px; }
            .summary-item { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .summary-item strong { color: #667eea; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #667eea; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bismillahi Operations Report</h1>
            <p>Period: ${startDate} to ${endDate}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="section">
            <h2>Summary</h2>
            <div class="summary">
              <div class="summary-item">
                <span>Total Sales:</span>
                <strong>₦${data.summary.totalSales.toLocaleString()}</strong>
              </div>
              <div class="summary-item">
                <span>Total Expenses:</span>
                <strong>₦${data.summary.totalExpenses.toLocaleString()}</strong>
              </div>
              <div class="summary-item">
                <span>Net Profit:</span>
                <strong>₦${data.summary.netProfit.toLocaleString()}</strong>
              </div>
              <div class="summary-item">
                <span>Total Transactions:</span>
                <strong>${data.summary.transactionCount}</strong>
              </div>
            </div>
          </div>

          ${data.sales.length > 0 ? `
            <div class="section">
              <h2>Sales Data</h2>
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Item</th>
                    <th>Volume/Quantity</th>
                    <th>Price per Unit</th>
                    <th>Total Amount</th>
                    <th>Payment Method</th>
                    <th>Sale Date</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.sales.map(sale => `
                    <tr>
                      <td>${sale.type}</td>
                      <td>${sale.item}</td>
                      <td>${sale.type === 'Pump Sale' ? sale.volume_liters : sale.quantity}</td>
                      <td>₦${sale.type === 'Pump Sale' ? sale.price_per_liter : sale.price_per_drum}</td>
                      <td>₦${sale.total_amount}</td>
                      <td>${sale.payment_method}</td>
                      <td>${sale.sale_date}</td>
                      <td>${sale.users?.full_name || 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${data.expenses.length > 0 ? `
            <div class="section">
              <h2>Expenses Data</h2>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Subcategory</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Receipt Number</th>
                    <th>Payment Method</th>
                    <th>Expense Date</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.expenses.map(expense => `
                    <tr>
                      <td>${expense.category}</td>
                      <td>${expense.subcategory || 'N/A'}</td>
                      <td>₦${expense.amount}</td>
                      <td>${expense.description || 'N/A'}</td>
                      <td>${expense.receipt_number || 'N/A'}</td>
                      <td>${expense.payment_method}</td>
                      <td>${expense.expense_date}</td>
                      <td>${expense.users?.full_name || 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${data.transfers.length > 0 ? `
            <div class="section">
              <h2>Fund Transfers</h2>
              <table>
                <thead>
                  <tr>
                    <th>From Account</th>
                    <th>To Account</th>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>Exchange Rate</th>
                    <th>Converted Amount</th>
                    <th>Purpose</th>
                    <th>Transfer Date</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.transfers.map(transfer => `
                    <tr>
                      <td>${transfer.from_account}</td>
                      <td>${transfer.to_account}</td>
                      <td>₦${transfer.amount}</td>
                      <td>${transfer.currency}</td>
                      <td>${transfer.exchange_rate || 'N/A'}</td>
                      <td>${transfer.converted_amount ? '₦' + transfer.converted_amount : 'N/A'}</td>
                      <td>${transfer.purpose || 'N/A'}</td>
                      <td>${transfer.transfer_date}</td>
                      <td>${transfer.users?.full_name || 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div class="footer">
            <p>This report was generated by Bismillahi Operations Management System</p>
          </div>
        </body>
      </html>
    `;
  }

  private async exportToJSON(data: ExportData, options: ExportOptions): Promise<string> {
    const { startDate, endDate } = options.dateRange;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bismillahi-operations-${startDate}-to-${endDate}-${timestamp}.json`;
    const fileUri = `${filename}`;

    const exportData = {
      metadata: {
        generated: new Date().toISOString(),
        period: { startDate, endDate },
        version: '1.0',
        system: 'Bismillahi Operations Management System',
      },
      summary: data.summary,
      data: {
        sales: data.sales,
        expenses: data.expenses,
        stock: data.stock,
        transfers: data.transfers,
      },
    };

    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2), {
      encoding: 'utf8' as any,
    });

    return fileUri;
  }

  async shareFile(fileUri: string, filename: string): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: this.getMimeType(filename),
          dialogTitle: `Share ${filename}`,
        });
      } else {
        Alert.alert('Sharing not available', 'File sharing is not available on this device');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share file');
    }
  }

  private getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
        return 'text/csv';
      case 'pdf':
        return 'application/pdf';
      case 'json':
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }

  async deleteFile(fileUri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(fileUri);
      }
    } catch (error) {
      console.error('Delete file error:', error);
    }
  }
}

export const exportService = new ExportService();
