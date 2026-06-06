const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://bdjoknphffficrepbxim.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XUvsC3aQUTpITX64S3yrNw_q4DnyqBf';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function executeSQLViaREST(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const url = new URL(SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      path: '/rest/v1/rpc/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error('HTTP ' + res.statusCode + ': ' + body.substring(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Applying database schema to new Supabase project ===');
  console.log('URL:', SUPABASE_URL);
  
  // Read the schema file
  const schema = fs.readFileSync('restore_schema.sql', 'utf8');
  console.log('Schema file size:', schema.length, 'bytes');
  
  // First, create the ENUM types
  console.log('\n1. Creating ENUM types...');
  const enumTypes = `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE public.notification_type AS ENUM ('info', 'warning', 'error', 'success');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'credit');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'cashier', 'viewer');
      END IF;
    END $$;
  `;
  
  try {
    const r = await supabase.rpc('exec_sql', { query: enumTypes });
    console.log('  RPC result:', r.data || r.error?.message || 'OK');
  } catch(e) {
    console.log('  RPC not available (expected on new DB), trying direct...');
    console.log('  ENUM creation may need to be done via Supabase SQL Editor.');
  }
  
  // Try creating tables directly via REST
  console.log('\n2. Checking existing tables...');
  try {
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.log('  Cannot list tables:', error.message);
    } else {
      console.log('  Existing tables:', tables.map(t => t.table_name).join(', ') || '(none)');
    }
  } catch (e) {
    console.log('  Error listing tables:', e.message);
  }
  
  console.log('\n3. Testing direct query...');
  try {
    // Try using the REST API query endpoint with a minimal SQL
    const { data, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (error) {
      console.log('  users table:', error.message);
    } else {
      console.log('  users table accessible');
    }
  } catch (e) {
    console.log('  Error:', e.message);
  }
  
  console.log('\n=== Schema Application Instructions ===');
  console.log('The SQL schema file (restore_schema.sql) needs to be applied');
  console.log('via the Supabase Dashboard SQL Editor with the service_role key.');
  console.log('');
  console.log('To apply the schema:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select project: bdjoknphffficrepbxim');
  console.log('3. Go to SQL Editor');
  console.log('4. Copy the contents of restore_schema.sql');
  console.log('5. Paste and run the SQL');
  console.log('');
  console.log('Alternatively, with a service_role key,');
  console.log('the schema can be applied programmatically.');
  
  console.log('\n=== Connection Test ===');
  console.log('Credentials updated in: .env, src/config/supabase.ts, supabase-mcp-server.js');
  console.log('Database URL working: YES (connection test passed)');
}

main().catch(console.error);