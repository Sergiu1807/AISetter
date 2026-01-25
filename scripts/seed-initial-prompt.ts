/**
 * Seed Initial Prompt Version
 *
 * This script creates the first prompt version in the database
 * using the current static prompt from the codebase.
 *
 * Run with: npm run db:seed-prompt
 */

import { createClient } from '@supabase/supabase-js';
import { STATIC_SYSTEM_PROMPT, DYNAMIC_CONTEXT_TEMPLATE } from '../src/prompts/appointment-setter';
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

async function seedInitialPrompt() {
  console.log('🌱 Seeding initial prompt version...\n');

  try {
    // Check if any prompt versions already exist
    const { data: existingVersions, error: checkError } = await supabase
      .from('prompt_versions')
      .select('id, version, is_active')
      .order('version', { ascending: false })
      .limit(1);

    if (checkError) {
      console.error('❌ Error checking existing versions:', checkError);
      process.exit(1);
    }

    if (existingVersions && existingVersions.length > 0) {
      console.log('ℹ️  Prompt versions already exist:');
      console.log('   Latest version:', existingVersions[0].version);
      console.log('   Active:', existingVersions[0].is_active ? 'Yes' : 'No');
      console.log('\n❓ Do you want to create a new version anyway?');
      console.log('   (The existing active version will be deactivated)');
      console.log('\n   Press Ctrl+C to cancel, or continue to create version', existingVersions[0].version + 1);

      // If running in non-interactive mode, skip
      if (!process.stdin.isTTY) {
        console.log('\n✅ Skipping - versions already exist');
        return;
      }
    }

    // Deactivate any active versions
    const { error: deactivateError } = await supabase
      .from('prompt_versions')
      .update({ is_active: false })
      .eq('is_active', true);

    if (deactivateError) {
      console.error('❌ Error deactivating existing versions:', deactivateError);
      process.exit(1);
    }

    // Get the next version number
    const nextVersion = existingVersions && existingVersions.length > 0
      ? existingVersions[0].version + 1
      : 1;

    // Create the new prompt version
    const { data: newVersion, error: insertError } = await supabase
      .from('prompt_versions')
      .insert({
        version: nextVersion,
        prompt_text: STATIC_SYSTEM_PROMPT,
        system_instructions: DYNAMIC_CONTEXT_TEMPLATE,
        is_active: true,
        deployed_at: new Date().toISOString(),
        total_conversations: 0,
        success_rate: 0,
        notes: nextVersion === 1
          ? 'Initial prompt version migrated from codebase'
          : 'Updated prompt version deployed via seed script'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating prompt version:', insertError);
      process.exit(1);
    }

    console.log('✅ Successfully created prompt version!');
    console.log('\n📊 Details:');
    console.log('   Version:', newVersion.version);
    console.log('   Active:', newVersion.is_active);
    console.log('   Deployed at:', new Date(newVersion.deployed_at).toLocaleString());
    console.log('   Prompt length:', STATIC_SYSTEM_PROMPT.length, 'characters');
    console.log('   Dynamic template length:', DYNAMIC_CONTEXT_TEMPLATE.length, 'characters');
    console.log('\n🎉 Bot is now using prompt version', newVersion.version);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the seed function
seedInitialPrompt()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
