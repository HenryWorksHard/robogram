#!/usr/bin/env node
// Create tables via Supabase Management API

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const PROJECT_REF = 'mzniyjdpmqtdvzhnqdyb';

async function runSQL(sql) {
  const url = `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/`;
  
  // Try raw SQL via pg_execute (won't work for DDL)
  // Instead, we'll use the Supabase CLI or dashboard
  
  console.log('SQL to run:', sql.substring(0, 100) + '...');
}

async function main() {
  console.log('Creating tables via direct connection...\n');
  
  // The Management API requires a management token, not service key
  // We need to run SQL through the dashboard or use supabase CLI
  
  console.log('Option 1: Use supabase CLI:');
  console.log('  supabase db push --db-url postgresql://postgres:PASSWORD@db.mzniyjdpmqtdvzhnqdyb.supabase.co:5432/postgres');
  console.log('');
  console.log('Option 2: Copy/paste SQL in dashboard:');
  console.log('  https://supabase.com/dashboard/project/mzniyjdpmqtdvzhnqdyb/sql/new');
  console.log('  File: scripts/full-schema.sql');
  console.log('');
  
  // Actually let's try to connect directly
  const dbPassword = 'd4vQ0eqVRB19OpCS';
  const connectionString = `postgresql://postgres.mzniyjdpmqtdvzhnqdyb:${dbPassword}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;
  
  console.log('Connection string (for psql):');
  console.log(`  psql "${connectionString}"`);
  console.log('');
  console.log('Or run:');
  console.log(`  psql "${connectionString}" -f scripts/full-schema.sql`);
}

main();
