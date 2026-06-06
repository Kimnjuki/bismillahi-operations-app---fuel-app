#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://bdjoknphffficrepbxim.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create MCP server
const server = new Server(
  {
    name: 'supabase-petroleum-operations',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Database Management Tools
      {
        name: 'execute_sql',
        description: 'Execute raw SQL queries on the Supabase database',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'SQL query to execute',
            },
            params: {
              type: 'array',
              description: 'Query parameters',
              items: { type: 'string' },
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_table_schema',
        description: 'Get the schema/structure of a database table',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Name of the table to get schema for',
            },
          },
          required: ['table_name'],
        },
      },
      {
        name: 'list_tables',
        description: 'List all tables in the database',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // User Management Tools
      {
        name: 'create_user',
        description: 'Create a new user in the system',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            password: { type: 'string' },
            full_name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'operator', 'cashier'] },
            phone: { type: 'string' },
            station_id: { type: 'string' },
          },
          required: ['email', 'password', 'full_name', 'role'],
        },
      },
      {
        name: 'get_users',
        description: 'Get list of users with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            role: { type: 'string' },
            station_id: { type: 'string' },
            limit: { type: 'number', default: 50 },
          },
        },
      },
      {
        name: 'update_user',
        description: 'Update user information',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            updates: {
              type: 'object',
              properties: {
                full_name: { type: 'string' },
                role: { type: 'string' },
                phone: { type: 'string' },
                is_active: { type: 'boolean' },
              },
            },
          },
          required: ['user_id', 'updates'],
        },
      },

      // Sales Management Tools
      {
        name: 'create_pump_sale',
        description: 'Create a new pump sale record',
        inputSchema: {
          type: 'object',
          properties: {
            pump_id: { type: 'string' },
            fuel_type: { type: 'string' },
            volume_liters: { type: 'number' },
            price_per_liter: { type: 'number' },
            total_amount: { type: 'number' },
            payment_method: { type: 'string' },
            customer_name: { type: 'string' },
            operator_id: { type: 'string' },
            station_id: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['pump_id', 'fuel_type', 'volume_liters', 'price_per_liter', 'total_amount', 'payment_method', 'operator_id', 'station_id'],
        },
      },
      {
        name: 'create_drum_sale',
        description: 'Create a new drum sale record',
        inputSchema: {
          type: 'object',
          properties: {
            drum_type: { type: 'string' },
            fuel_type: { type: 'string' },
            quantity: { type: 'number' },
            price_per_drum: { type: 'number' },
            total_amount: { type: 'number' },
            payment_method: { type: 'string' },
            customer_name: { type: 'string' },
            operator_id: { type: 'string' },
            station_id: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['drum_type', 'fuel_type', 'quantity', 'price_per_drum', 'total_amount', 'payment_method', 'operator_id', 'station_id'],
        },
      },
      {
        name: 'get_sales',
        description: 'Get sales records with filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string' },
            end_date: { type: 'string' },
            station_id: { type: 'string' },
            operator_id: { type: 'string' },
            fuel_type: { type: 'string' },
            sale_type: { type: 'string', enum: ['pump', 'drum'] },
            limit: { type: 'number', default: 100 },
          },
        },
      },

      // Stock Management Tools
      {
        name: 'get_stock_levels',
        description: 'Get current stock levels for all items',
        inputSchema: {
          type: 'object',
          properties: {
            station_id: { type: 'string' },
            fuel_type: { type: 'string' },
            low_stock_only: { type: 'boolean', default: false },
          },
        },
      },
      {
        name: 'update_stock',
        description: 'Update stock levels for an item',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: { type: 'string' },
            quantity: { type: 'number' },
            operation: { type: 'string', enum: ['add', 'subtract', 'set'] },
            reason: { type: 'string' },
            operator_id: { type: 'string' },
          },
          required: ['item_id', 'quantity', 'operation', 'reason', 'operator_id'],
        },
      },
      {
        name: 'create_stock_variance',
        description: 'Record a stock variance/adjustment',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: { type: 'string' },
            expected_quantity: { type: 'number' },
            actual_quantity: { type: 'number' },
            variance_reason: { type: 'string' },
            operator_id: { type: 'string' },
            station_id: { type: 'string' },
          },
          required: ['item_id', 'expected_quantity', 'actual_quantity', 'variance_reason', 'operator_id', 'station_id'],
        },
      },

      // Expense Management Tools
      {
        name: 'create_expense',
        description: 'Create a new expense record',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            amount: { type: 'number' },
            description: { type: 'string' },
            payment_method: { type: 'string' },
            operator_id: { type: 'string' },
            station_id: { type: 'string' },
            receipt_url: { type: 'string' },
            date: { type: 'string' },
          },
          required: ['category', 'amount', 'description', 'payment_method', 'operator_id', 'station_id'],
        },
      },
      {
        name: 'get_expenses',
        description: 'Get expense records with filtering',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string' },
            end_date: { type: 'string' },
            category: { type: 'string' },
            station_id: { type: 'string' },
            operator_id: { type: 'string' },
            limit: { type: 'number', default: 100 },
          },
        },
      },

      // Fund Transfer Tools
      {
        name: 'create_fund_transfer',
        description: 'Create a new fund transfer between accounts',
        inputSchema: {
          type: 'object',
          properties: {
            from_account: { type: 'string' },
            to_account: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            description: { type: 'string' },
            operator_id: { type: 'string' },
            reference: { type: 'string' },
          },
          required: ['from_account', 'to_account', 'amount', 'currency', 'description', 'operator_id'],
        },
      },
      {
        name: 'get_fund_transfers',
        description: 'Get fund transfer records',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string' },
            end_date: { type: 'string' },
            account_id: { type: 'string' },
            limit: { type: 'number', default: 100 },
          },
        },
      },

      // Reporting Tools
      {
        name: 'get_daily_sales_report',
        description: 'Generate daily sales report',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            station_id: { type: 'string' },
            include_breakdown: { type: 'boolean', default: true },
          },
          required: ['date'],
        },
      },
      {
        name: 'get_monthly_summary',
        description: 'Generate monthly summary report',
        inputSchema: {
          type: 'object',
          properties: {
            year: { type: 'number' },
            month: { type: 'number' },
            station_id: { type: 'string' },
          },
          required: ['year', 'month'],
        },
      },
      {
        name: 'get_profit_loss_statement',
        description: 'Generate profit and loss statement',
        inputSchema: {
          type: 'object',
          properties: {
            start_date: { type: 'string' },
            end_date: { type: 'string' },
            station_id: { type: 'string' },
          },
          required: ['start_date', 'end_date'],
        },
      },

      // Notification Tools
      {
        name: 'create_notification',
        description: 'Create a new notification',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            message: { type: 'string' },
            type: { type: 'string', enum: ['info', 'warning', 'error', 'success'] },
            user_id: { type: 'string' },
            station_id: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
          },
          required: ['title', 'message', 'type'],
        },
      },
      {
        name: 'get_notifications',
        description: 'Get notifications for a user or station',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            station_id: { type: 'string' },
            unread_only: { type: 'boolean', default: false },
            limit: { type: 'number', default: 50 },
          },
        },
      },

      // Exchange Rate Tools
      {
        name: 'update_exchange_rate',
        description: 'Update exchange rate for a currency',
        inputSchema: {
          type: 'object',
          properties: {
            currency: { type: 'string' },
            rate: { type: 'number' },
            operator_id: { type: 'string' },
          },
          required: ['currency', 'rate', 'operator_id'],
        },
      },
      {
        name: 'get_exchange_rates',
        description: 'Get current exchange rates',
        inputSchema: {
          type: 'object',
          properties: {
            currency: { type: 'string' },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Database Management
      case 'execute_sql':
        return await executeSql(args.query, args.params || []);

      case 'get_table_schema':
        return await getTableSchema(args.table_name);

      case 'list_tables':
        return await listTables();

      // User Management
      case 'create_user':
        return await createUser(args);

      case 'get_users':
        return await getUsers(args);

      case 'update_user':
        return await updateUser(args.user_id, args.updates);

      // Sales Management
      case 'create_pump_sale':
        return await createPumpSale(args);

      case 'create_drum_sale':
        return await createDrumSale(args);

      case 'get_sales':
        return await getSales(args);

      // Stock Management
      case 'get_stock_levels':
        return await getStockLevels(args);

      case 'update_stock':
        return await updateStock(args);

      case 'create_stock_variance':
        return await createStockVariance(args);

      // Expense Management
      case 'create_expense':
        return await createExpense(args);

      case 'get_expenses':
        return await getExpenses(args);

      // Fund Transfer
      case 'create_fund_transfer':
        return await createFundTransfer(args);

      case 'get_fund_transfers':
        return await getFundTransfers(args);

      // Reporting
      case 'get_daily_sales_report':
        return await getDailySalesReport(args);

      case 'get_monthly_summary':
        return await getMonthlySummary(args);

      case 'get_profit_loss_statement':
        return await getProfitLossStatement(args);

      // Notifications
      case 'create_notification':
        return await createNotification(args);

      case 'get_notifications':
        return await getNotifications(args);

      // Exchange Rates
      case 'update_exchange_rate':
        return await updateExchangeRate(args);

      case 'get_exchange_rates':
        return await getExchangeRates(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message}`,
        },
      ],
    };
  }
});

// Database Management Functions
async function executeSql(query, params = []) {
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql: query, 
    params: params 
  });
  
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function getTableSchema(tableName) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('*')
    .eq('table_name', tableName);
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function listTables() {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// User Management Functions
async function createUser(userData) {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: `User created successfully: ${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

async function getUsers(filters = {}) {
  let query = supabase.from('users').select('*');
  
  if (filters.role) query = query.eq('role', filters.role);
  if (filters.station_id) query = query.eq('station_id', filters.station_id);
  if (filters.limit) query = query.limit(filters.limit);
  
  const { data, error } = await query;
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function updateUser(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: `User updated successfully: ${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

// Sales Management Functions
async function createPumpSale(saleData) {
  const { data, error } = await supabase
    .from('pump_sales')
    .insert([{
      ...saleData,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: `Pump sale created successfully: ${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

async function createDrumSale(saleData) {
  const { data, error } = await supabase
    .from('drum_sales')
    .insert([{
      ...saleData,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: `Drum sale created successfully: ${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

async function getSales(filters = {}) {
  let pumpQuery = supabase.from('pump_sales').select('*');
  let drumQuery = supabase.from('drum_sales').select('*');
  
  // Apply common filters
  if (filters.start_date) {
    pumpQuery = pumpQuery.gte('created_at', filters.start_date);
    drumQuery = drumQuery.gte('created_at', filters.start_date);
  }
  if (filters.end_date) {
    pumpQuery = pumpQuery.lte('created_at', filters.end_date);
    drumQuery = drumQuery.lte('created_at', filters.end_date);
  }
  if (filters.station_id) {
    pumpQuery = pumpQuery.eq('station_id', filters.station_id);
    drumQuery = drumQuery.eq('station_id', filters.station_id);
  }
  if (filters.operator_id) {
    pumpQuery = pumpQuery.eq('operator_id', filters.operator_id);
    drumQuery = drumQuery.eq('operator_id', filters.operator_id);
  }
  if (filters.fuel_type) {
    pumpQuery = pumpQuery.eq('fuel_type', filters.fuel_type);
    drumQuery = drumQuery.eq('fuel_type', filters.fuel_type);
  }
  if (filters.limit) {
    pumpQuery = pumpQuery.limit(filters.limit);
    drumQuery = drumQuery.limit(filters.limit);
  }
  
  const [pumpResult, drumResult] = await Promise.all([
    pumpQuery,
    drumQuery
  ]);
  
  if (pumpResult.error) throw pumpResult.error;
  if (drumResult.error) throw drumResult.error;
  
  const sales = {
    pump_sales: pumpResult.data,
    drum_sales: drumResult.data,
    total_pump_sales: pumpResult.data.length,
    total_drum_sales: drumResult.data.length,
  };
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(sales, null, 2),
      },
    ],
  };
}

// Stock Management Functions
async function getStockLevels(filters = {}) {
  let query = supabase.from('stock_items').select('*');
  
  if (filters.station_id) query = query.eq('station_id', filters.station_id);
  if (filters.fuel_type) query = query.eq('fuel_type', filters.fuel_type);
  if (filters.low_stock_only) query = query.lt('current_quantity', 'minimum_quantity');
  
  const { data, error } = await query;
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function updateStock(args) {
  const { item_id, quantity, operation, reason, operator_id } = args;
  
  // Get current stock
  const { data: currentItem, error: fetchError } = await supabase
    .from('stock_items')
    .select('current_quantity')
    .eq('id', item_id)
    .single();
    
  if (fetchError) throw fetchError;
  
  let newQuantity;
  switch (operation) {
    case 'add':
      newQuantity = currentItem.current_quantity + quantity;
      break;
    case 'subtract':
      newQuantity = currentItem.current_quantity - quantity;
      break;
    case 'set':
      newQuantity = quantity;
      break;
    default:
      throw new Error('Invalid operation. Use add, subtract, or set.');
  }
  
  // Update stock
  const { data, error } = await supabase
    .from('stock_items')
    .update({ 
      current_quantity: newQuantity,
      updated_at: new Date().toISOString()
    })
    .eq('id', item_id)
    .select()
    .single();
    
  if (error) throw error;
  
  // Log the change
  await supabase
    .from('stock_movements')
    .insert([{
      item_id,
      previous_quantity: currentItem.current_quantity,
      new_quantity: newQuantity,
      operation,
      reason,
      operator_id,
      created_at: new Date().toISOString()
    }]);
  
  return {
    content: [
      {
        type: 'text',
        text: `Stock updated successfully: ${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

async function createStockVariance(varianceData) {
  const { data, error } = await supabase
    .from('stock_variances')
    .insert([{
      ...varianceData,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: `Stock variance recorded: ${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

// Expense Management Functions
async function createExpense(expenseData) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      ...expenseData,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: `Expense created successfully: ${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

async function getExpenses(filters = {}) {
  let query = supabase.from('expenses').select('*');
  
  if (filters.start_date) query = query.gte('date', filters.start_date);
  if (filters.end_date) query = query.lte('date', filters.end_date);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.station_id) query = query.eq('station_id', filters.station_id);
  if (filters.operator_id) query = query.eq('operator_id', filters.operator_id);
  if (filters.limit) query = query.limit(filters.limit);
  
  const { data, error } = await query;
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// Fund Transfer Functions
async function createFundTransfer(transferData) {
  const { data, error } = await supabase
    .from('fund_transfers')
    .insert([{
      ...transferData,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: `Fund transfer created successfully: ${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

async function getFundTransfers(filters = {}) {
  let query = supabase.from('fund_transfers').select('*');
  
  if (filters.start_date) query = query.gte('created_at', filters.start_date);
  if (filters.end_date) query = query.lte('created_at', filters.end_date);
  if (filters.account_id) {
    query = query.or(`from_account.eq.${filters.account_id},to_account.eq.${filters.account_id}`);
  }
  if (filters.limit) query = query.limit(filters.limit);
  
  const { data, error } = await query;
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// Reporting Functions
async function getDailySalesReport(args) {
  const { date, station_id, include_breakdown } = args;
  
  let pumpQuery = supabase
    .from('pump_sales')
    .select('*')
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`);
    
  let drumQuery = supabase
    .from('drum_sales')
    .select('*')
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`);
  
  if (station_id) {
    pumpQuery = pumpQuery.eq('station_id', station_id);
    drumQuery = drumQuery.eq('station_id', station_id);
  }
  
  const [pumpResult, drumResult] = await Promise.all([
    pumpQuery,
    drumQuery
  ]);
  
  if (pumpResult.error) throw pumpResult.error;
  if (drumResult.error) throw drumResult.error;
  
  const report = {
    date,
    station_id,
    total_pump_sales: pumpResult.data.length,
    total_drum_sales: drumResult.data.length,
    total_pump_revenue: pumpResult.data.reduce((sum, sale) => sum + sale.total_amount, 0),
    total_drum_revenue: drumResult.data.reduce((sum, sale) => sum + sale.total_amount, 0),
    total_revenue: 0,
  };
  
  report.total_revenue = report.total_pump_revenue + report.total_drum_revenue;
  
  if (include_breakdown) {
    report.pump_sales_breakdown = pumpResult.data;
    report.drum_sales_breakdown = drumResult.data;
  }
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(report, null, 2),
      },
    ],
  };
}

async function getMonthlySummary(args) {
  const { year, month, station_id } = args;
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  let pumpQuery = supabase
    .from('pump_sales')
    .select('*')
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`);
    
  let drumQuery = supabase
    .from('drum_sales')
    .select('*')
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`);
    
  let expenseQuery = supabase
    .from('expenses')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
  
  if (station_id) {
    pumpQuery = pumpQuery.eq('station_id', station_id);
    drumQuery = drumQuery.eq('station_id', station_id);
    expenseQuery = expenseQuery.eq('station_id', station_id);
  }
  
  const [pumpResult, drumResult, expenseResult] = await Promise.all([
    pumpQuery,
    drumQuery,
    expenseQuery
  ]);
  
  if (pumpResult.error) throw pumpResult.error;
  if (drumResult.error) throw drumResult.error;
  if (expenseResult.error) throw expenseResult.error;
  
  const summary = {
    year,
    month,
    station_id,
    total_sales: pumpResult.data.length + drumResult.data.length,
    total_revenue: pumpResult.data.reduce((sum, sale) => sum + sale.total_amount, 0) + 
                   drumResult.data.reduce((sum, sale) => sum + sale.total_amount, 0),
    total_expenses: expenseResult.data.reduce((sum, expense) => sum + expense.amount, 0),
    net_profit: 0,
    pump_sales_count: pumpResult.data.length,
    drum_sales_count: drumResult.data.length,
    expense_count: expenseResult.data.length,
  };
  
  summary.net_profit = summary.total_revenue - summary.total_expenses;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(summary, null, 2),
      },
    ],
  };
}

async function getProfitLossStatement(args) {
  const { start_date, end_date, station_id } = args;
  
  let salesQuery = supabase
    .from('pump_sales')
    .select('total_amount')
    .gte('created_at', `${start_date}T00:00:00`)
    .lte('created_at', `${end_date}T23:59:59`);
    
  let drumQuery = supabase
    .from('drum_sales')
    .select('total_amount')
    .gte('created_at', `${start_date}T00:00:00`)
    .lte('created_at', `${end_date}T23:59:59`);
    
  let expenseQuery = supabase
    .from('expenses')
    .select('amount, category')
    .gte('date', start_date)
    .lte('date', end_date);
  
  if (station_id) {
    salesQuery = salesQuery.eq('station_id', station_id);
    drumQuery = drumQuery.eq('station_id', station_id);
    expenseQuery = expenseQuery.eq('station_id', station_id);
  }
  
  const [salesResult, drumResult, expenseResult] = await Promise.all([
    salesQuery,
    drumQuery,
    expenseQuery
  ]);
  
  if (salesResult.error) throw salesResult.error;
  if (drumResult.error) throw drumResult.error;
  if (expenseResult.error) throw expenseResult.error;
  
  const totalRevenue = salesResult.data.reduce((sum, sale) => sum + sale.total_amount, 0) +
                      drumResult.data.reduce((sum, sale) => sum + sale.total_amount, 0);
  
  const expensesByCategory = expenseResult.data.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});
  
  const totalExpenses = Object.values(expensesByCategory).reduce((sum, amount) => sum + amount, 0);
  
  const statement = {
    period: { start_date, end_date },
    station_id,
    revenue: {
      pump_sales: salesResult.data.reduce((sum, sale) => sum + sale.total_amount, 0),
      drum_sales: drumResult.data.reduce((sum, sale) => sum + sale.total_amount, 0),
      total: totalRevenue,
    },
    expenses: {
      by_category: expensesByCategory,
      total: totalExpenses,
    },
    net_profit: totalRevenue - totalExpenses,
    profit_margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(2) + '%' : '0%',
  };
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(statement, null, 2),
      },
    ],
  };
}

// Notification Functions
async function createNotification(notificationData) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{
      ...notificationData,
      created_at: new Date().toISOString(),
      is_read: false,
    }])
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: `Notification created successfully: ${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

async function getNotifications(filters = {}) {
  let query = supabase.from('notifications').select('*');
  
  if (filters.user_id) query = query.eq('user_id', filters.user_id);
  if (filters.station_id) query = query.eq('station_id', filters.station_id);
  if (filters.unread_only) query = query.eq('is_read', false);
  if (filters.limit) query = query.limit(filters.limit);
  
  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// Exchange Rate Functions
async function updateExchangeRate(args) {
  const { currency, rate, operator_id } = args;
  
  const { data, error } = await supabase
    .from('exchange_rates')
    .upsert([{
      currency,
      rate,
      updated_by: operator_id,
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: `Exchange rate updated successfully: ${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

async function getExchangeRates(filters = {}) {
  let query = supabase.from('exchange_rates').select('*');
  
  if (filters.currency) query = query.eq('currency', filters.currency);
  
  const { data, error } = await query;
  if (error) throw error;
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Supabase MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
