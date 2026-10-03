import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { supabase } from '../services/supabaseService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_FILE = path.join(__dirname, '../../data/passwords.json');

async function runMigration() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseSecretKey = (process.env.SUPABASE_SECRET_KEY || '').trim();

  if (!supabaseUrl || !supabaseSecretKey || !supabase) {
    console.error('[Migration Error] Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables.');
    process.exit(1);
  }

  if (!fs.existsSync(STORE_FILE)) {
    console.log('[Migration Notice] passwords.json file does not exist. Nothing to migrate.');
    process.exit(0);
  }

  let rawStore = {};
  try {
    const content = fs.readFileSync(STORE_FILE, 'utf-8');
    rawStore = JSON.parse(content || '{}');
  } catch (err) {
    console.error('[Migration Error] Failed to read or parse passwords.json:', err.message);
    process.exit(1);
  }

  const entries = Object.entries(rawStore);
  if (entries.length === 0) {
    console.log('[Migration Notice] No password entries found in passwords.json.');
    process.exit(0);
  }

  const stats = {
    migrated: 0,
    already_migrated: 0,
    unmatched: 0,
    errors: 0
  };

  for (const [rawEmail, passwordHash] of entries) {
    const normalizedEmail = (rawEmail || '').trim().toLowerCase();
    if (!normalizedEmail || !passwordHash) continue;

    try {
      // 1. Fetch user from Supabase public.users
      const { data: user, error } = await supabase
        .from('users')
        .select('email, password_hash')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (error) {
        console.error(`[Migration Warning] Query failed for user email: ${error.message}`);
        stats.errors++;
        continue;
      }

      if (!user) {
        stats.unmatched++;
        continue;
      }

      // 2. Check if password_hash is already populated
      if (user.password_hash) {
        stats.already_migrated++;
        continue;
      }

      // 3. Perform update of password_hash into public.users
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('email', normalizedEmail);

      if (updateError) {
        console.error(`[Migration Warning] Update failed for user email: ${updateError.message}`);
        stats.errors++;
      } else {
        stats.migrated++;
      }
    } catch (err) {
      console.error(`[Migration Warning] Processing error: ${err.message}`);
      stats.errors++;
    }
  }

  console.log('\nMigration Summary:');
  console.log('------------------');
  console.log(`migrated: ${stats.migrated}`);
  console.log(`already_migrated: ${stats.already_migrated}`);
  console.log(`unmatched: ${stats.unmatched}`);
  console.log(`errors: ${stats.errors}\n`);
}

runMigration().catch((err) => {
  console.error('[Migration Fatal Error]', err.message);
  process.exit(1);
});
