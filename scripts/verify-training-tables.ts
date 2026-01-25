/**
 * Verify Training Tables
 *
 * This script checks if the required database tables for the training feature exist
 * and provides helpful information about the migration status.
 *
 * Run with: npm run db:verify
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TableInfo {
  tableName: string;
  exists: boolean;
  rowCount?: number;
  error?: string;
}

async function checkTable(tableName: string): Promise<TableInfo> {
  try {
    // Try to count rows in the table
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      // Check if error is because table doesn't exist
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return { tableName, exists: false };
      }
      return { tableName, exists: true, error: error.message };
    }

    return { tableName, exists: true, rowCount: count || 0 };
  } catch (error: any) {
    return { tableName, exists: false, error: error.message };
  }
}

async function verifyTables() {
  console.log('🔍 Verifying training feature database tables...\n');

  const requiredTables = [
    'training_examples',
    'prompt_versions',
    'users',
    'leads',
    'conversations',
    'messages',
    'activities',
    'notifications'
  ];

  const results: TableInfo[] = [];

  for (const tableName of requiredTables) {
    const result = await checkTable(tableName);
    results.push(result);
  }

  console.log('📊 Results:\n');

  let allExist = true;
  let hasErrors = false;

  for (const result of results) {
    if (result.exists) {
      if (result.error) {
        console.log(`⚠️  ${result.tableName.padEnd(25)} - EXISTS but has error: ${result.error}`);
        hasErrors = true;
      } else {
        console.log(`✅ ${result.tableName.padEnd(25)} - ${result.rowCount} rows`);
      }
    } else {
      console.log(`❌ ${result.tableName.padEnd(25)} - MISSING`);
      allExist = false;
    }
  }

  console.log('\n' + '─'.repeat(60) + '\n');

  if (!allExist) {
    console.log('❌ Some required tables are missing!');
    console.log('\n📝 To fix this:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Run the migration file: supabase-dashboard-migration.sql');
    console.log('\n   File location: /Users/sergiucastrase/Ai Setter/supabase-dashboard-migration.sql');
    process.exit(1);
  }

  if (hasErrors) {
    console.log('⚠️  All tables exist but some have errors (likely permissions)');
    console.log('\n   This might be OK if RLS policies are restrictive.');
    console.log('   Try running the app to see if it works.\n');
    process.exit(0);
  }

  console.log('✅ All required tables exist!');

  // Check if prompt versions need seeding
  const promptInfo = results.find(r => r.tableName === 'prompt_versions');
  if (promptInfo && promptInfo.rowCount === 0) {
    console.log('\n💡 Next step: Seed initial prompt version');
    console.log('   Run: npm run db:seed-prompt');
  } else if (promptInfo && promptInfo.rowCount! > 0) {
    console.log('\n✨ System is ready!');
    console.log('   Prompt versions:', promptInfo.rowCount);

    // Check which version is active
    const { data: activeVersion } = await supabase
      .from('prompt_versions')
      .select('version, deployed_at, total_conversations')
      .eq('is_active', true)
      .single();

    if (activeVersion) {
      console.log('   Active version:', activeVersion.version);
      console.log('   Deployed:', new Date(activeVersion.deployed_at).toLocaleString());
      console.log('   Conversations:', activeVersion.total_conversations);
    }
  }

  console.log('\n🎉 Training feature is ready to use!');
  process.exit(0);
}

// Run the verification
verifyTables()
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
