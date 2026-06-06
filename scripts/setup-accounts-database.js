const fs = require('fs');
const path = require('path');

// Read the SQL schema file
const schemaPath = path.join(__dirname, '../database/setup-accounts-schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

console.log('Accounts Database Schema Setup');
console.log('================================');
console.log('');
console.log('This script contains the SQL schema for the accounts management system.');
console.log('Please run the following SQL commands in your Supabase SQL editor:');
console.log('');
console.log('1. Copy the contents of database/setup-accounts-schema.sql');
console.log('2. Paste it into your Supabase SQL editor');
console.log('3. Execute the script');
console.log('');
console.log('The schema includes:');
console.log('- account_receivables table for managing money owed to the company');
console.log('- account_payables table for managing money the company owes');
console.log('- account_transactions table for transaction history');
console.log('- Row Level Security (RLS) policies');
console.log('- Indexes for better performance');
console.log('- Sample data for testing');
console.log('- Account summary view');
console.log('');
console.log('After running the schema, the accounts functionality will be available in the app.');
console.log('');
console.log('Schema Preview:');
console.log('===============');
console.log(schema.substring(0, 500) + '...');
console.log('');
console.log('Full schema available in: database/setup-accounts-schema.sql');










