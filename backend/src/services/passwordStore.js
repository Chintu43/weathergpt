/**
 * TEMPORARY LEGACY PASSWORD STORE
 * NOTE: This local JSON store is kept temporarily for backward compatibility 
 * during migration of password hashes to Supabase public.users.password_hash.
 * It will be removed once all user password hashes are fully migrated to Supabase.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'passwords.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('[PasswordStore] Warning creating data directory:', err.message);
  }
}

function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      return JSON.parse(content || '{}');
    }
  } catch (err) {
    console.warn('[PasswordStore] Warning reading password store:', err.message);
  }
  return {};
}

function saveStore(store) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('[PasswordStore] Error writing password store:', err.message);
  }
}

export const passwordStore = {
  get(email) {
    const store = loadStore();
    const normalizedEmail = (email || '').trim().toLowerCase();
    return store[normalizedEmail] || null;
  },

  set(email, passwordHash) {
    const store = loadStore();
    const normalizedEmail = (email || '').trim().toLowerCase();
    store[normalizedEmail] = passwordHash;
    saveStore(store);
  },

  has(email) {
    const store = loadStore();
    const normalizedEmail = (email || '').trim().toLowerCase();
    return !!store[normalizedEmail];
  }
};
