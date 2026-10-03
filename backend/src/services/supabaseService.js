import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { passwordStore } from './passwordStore.js';

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseSecretKey = (process.env.SUPABASE_SECRET_KEY || '').trim();

if (!supabaseUrl || !supabaseSecretKey) {
  console.warn('[SupabaseService] Warning: SUPABASE_URL or SUPABASE_SECRET_KEY is missing from environment variables.');
}

export const supabase = (supabaseUrl && supabaseSecretKey)
  ? createClient(supabaseUrl, supabaseSecretKey)
  : null;

/**
 * Retrieves a single user by email from Supabase public.users.
 */
export async function getUserByEmail(email) {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const normalizedEmail = (email || '').trim().toLowerCase();
  const { data, error } = await supabase
    .from('users')
    .select('name, email, phone_number, phone_verified, sms_enabled, city, district, state, country, latitude, longitude, role, created_at, updated_at')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error('[SupabaseService] Error fetching user by email:', error.message);
    throw error;
  }

  if (data) {
    data.password = passwordStore.get(normalizedEmail);
  }

  return data;
}

/**
 * Updates user password in Supabase public.users while preserving role and existing profile fields.
 */
export async function updateUserPassword(email, passwordHash) {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const normalizedEmail = (email || '').trim().toLowerCase();

  const user = await getUserByEmail(normalizedEmail);
  if (!user) {
    throw new Error('User not found.');
  }

  // Save bcrypt hash in backend password store
  passwordStore.set(normalizedEmail, passwordHash);

  // Update updated_at timestamp in Supabase
  const { data, error } = await supabase
    .from('users')
    .update({
      updated_at: new Date().toISOString()
    })
    .eq('email', normalizedEmail)
    .select('name, email, phone_number, phone_verified, sms_enabled, city, district, state, country, role, created_at, updated_at')
    .single();

  if (error) {
    console.warn('[SupabaseService] Warning updating updated_at timestamp in Supabase:', error.message);
    return { ...user, password: passwordHash };
  }

  return { ...data, password: passwordHash };
}

/**
 * Saves or updates user information in Supabase public.users table.
 * - If user email exists, updates phone_number and basic info without creating duplicates.
 * - If user email does not exist, creates a new user row.
 * - If phone_number belongs to a DIFFERENT user account, throws a conflict error (409).
 * - Preserves existing user role (e.g., admin).
 * - Returns { user, isNew }.
 */
export async function saveOrUpdateUser({ name, email, phone_number, city, district, state, country, latitude, longitude, role }) {
  if (!supabase) {
    console.error('[SupabaseService] Error: Supabase client is not initialized.');
    throw new Error('Supabase client not initialized.');
  }

  const normalizedEmail = (email || '').trim().toLowerCase();
  const trimmedPhone = (phone_number || '').trim();

  if (!normalizedEmail) {
    const err = new Error('Email address is required.');
    err.status = 400;
    err.code = 'INVALID_INPUT';
    throw err;
  }
  if (!trimmedPhone) {
    const err = new Error('Phone number is required.');
    err.status = 400;
    err.code = 'INVALID_INPUT';
    throw err;
  }

  // 1. Query existing user by email
  const { data: userByEmail, error: findEmailError } = await supabase
    .from('users')
    .select('name, email, phone_number, role, city, district, state, country, latitude, longitude')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (findEmailError) {
    console.error('[SupabaseService] Select query error (email):', findEmailError.message);
    throw findEmailError;
  }

  // 2. Query existing user by phone number
  const { data: userByPhone, error: findPhoneError } = await supabase
    .from('users')
    .select('name, email, phone_number, role')
    .eq('phone_number', trimmedPhone)
    .maybeSingle();

  if (findPhoneError) {
    console.error('[SupabaseService] Select query error (phone):', findPhoneError.message);
    throw findPhoneError;
  }

  // 3. Phone conflict check: only conflict when the phone row has a non-null email belonging to a DIFFERENT account
  if (
    userByPhone &&
    userByPhone.email &&                                          // phone row already associated with an email
    userByPhone.email.toLowerCase() !== normalizedEmail           // and it's a different email than this user
  ) {
    const conflictErr = new Error('This phone number is already registered with another account.');
    conflictErr.status = 409;
    conflictErr.code = 'PHONE_ALREADY_EXISTS';
    throw conflictErr;
  }

  const now = new Date().toISOString();

  if (userByEmail) {
    // Preserve existing role (never downgrade admin to user)
    const targetRole = userByEmail.role || role || 'user';

    const updateData = {
      phone_number: trimmedPhone,
      phone_verified: false,
      sms_enabled: true,
      role: targetRole,
      updated_at: now
    };

    if (name && name.trim()) updateData.name = name.trim();
    if (city !== undefined && city !== null && city !== '') updateData.city = city;
    if (district !== undefined && district !== null && district !== '') updateData.district = district;
    if (state !== undefined && state !== null && state !== '') updateData.state = state;
    if (country !== undefined && country !== null && country !== '') updateData.country = country;
    if (latitude !== undefined && latitude !== null) updateData.latitude = latitude;
    if (longitude !== undefined && longitude !== null) updateData.longitude = longitude;

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('email', userByEmail.email)
      .select('name, email, phone_number, phone_verified, sms_enabled, city, district, state, country, latitude, longitude, role, created_at, updated_at')
      .single();

    if (updateError) {
      if (updateError.code === '23505' || (updateError.message && updateError.message.includes('phone_number'))) {
        const conflictErr = new Error('This phone number is already registered with another account.');
        conflictErr.status = 409;
        conflictErr.code = 'PHONE_ALREADY_EXISTS';
        throw conflictErr;
      }
      console.error('[SupabaseService] Update query error:', updateError.message);
      throw updateError;
    }

    return { user: updatedUser, isNew: false };
  } else if (userByPhone && !userByPhone.email) {
    // Phone row exists but has no email yet — associate this email with it (update-in-place)
    console.log(`[SupabaseService] Associating email "${normalizedEmail}" with orphaned phone row ${trimmedPhone}`);
    const targetRole = userByPhone.role || role || 'user';

    const updateData = {
      email: normalizedEmail,
      phone_number: trimmedPhone,
      phone_verified: false,
      sms_enabled: true,
      role: targetRole,
      updated_at: now
    };

    if (name && name.trim()) updateData.name = name.trim();
    if (city !== undefined && city !== null && city !== '') updateData.city = city;
    if (district !== undefined && district !== null && district !== '') updateData.district = district;
    if (state !== undefined && state !== null && state !== '') updateData.state = state;
    if (country !== undefined && country !== null && country !== '') updateData.country = country;
    if (latitude !== undefined && latitude !== null) updateData.latitude = latitude;
    if (longitude !== undefined && longitude !== null) updateData.longitude = longitude;

    const { data: updatedUser, error: phoneUpdateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('phone_number', trimmedPhone)
      .select('name, email, phone_number, phone_verified, sms_enabled, city, district, state, country, latitude, longitude, role, created_at, updated_at')
      .single();

    if (phoneUpdateError) {
      console.error('[SupabaseService] Phone-only update error:', phoneUpdateError.message);
      throw phoneUpdateError;
    }

    return { user: updatedUser, isNew: false };
  } else {
    // Insert new user record
    const insertData = {
      name: (name || normalizedEmail.split('@')[0]).trim(),
      email: normalizedEmail,
      phone_number: trimmedPhone,
      phone_verified: false,
      sms_enabled: true,
      city: city || null,
      district: district || null,
      state: state || null,
      country: country || 'India',
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
      role: role || 'user',
      created_at: now,
      updated_at: now
    };

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(insertData)
      .select('name, email, phone_number, phone_verified, sms_enabled, city, district, state, country, latitude, longitude, role, created_at, updated_at')
      .single();

    if (insertError) {
      if (insertError.code === '23505' || (insertError.message && (insertError.message.includes('phone_number') || insertError.message.includes('users_phone_number_key')))) {
        const conflictErr = new Error('This phone number is already registered with another account.');
        conflictErr.status = 409;
        conflictErr.code = 'PHONE_ALREADY_EXISTS';
        throw conflictErr;
      }
      if (insertError.code === '23505' || (insertError.message && insertError.message.includes('email'))) {
        const conflictErr = new Error('An account with this email address already exists.');
        conflictErr.status = 409;
        conflictErr.code = 'EMAIL_ALREADY_EXISTS';
        throw conflictErr;
      }
      console.error('[SupabaseService] Insert query error:', insertError.message);
      throw insertError;
    }

    return { user: newUser, isNew: true };
  }
}

/**
 * Retrieves all registered users from Supabase public.users for Admin Dashboard.
 * Returns only necessary user fields (no secret keys or credentials).
 */
export async function getAllUsersForAdmin() {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  const { data, error } = await supabase
    .from('users')
    .select('name, email, phone_number, phone_verified, sms_enabled, city, district, state, country, role, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SupabaseService] Failed to fetch users for admin:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Verifies selected recipient user IDs/emails from Supabase database.
 * Ensures recipients have valid phone numbers and sms_enabled === true.
 */
export async function getVerifiedRecipientsForAdmin(userIds = []) {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  if (!userIds || userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('users')
    .select('name, email, phone_number, sms_enabled, phone_verified')
    .in('email', userIds)
    .not('phone_number', 'is', null)
    .eq('sms_enabled', true);

  if (error) {
    console.error('[SupabaseService] Failed to verify recipients for admin:', error.message);
    throw error;
  }

  return (data || []).filter((u) => u.phone_number && u.phone_number.trim().length > 0);
}

/**
 * Verifies selected recipient emails from Supabase public.users for Weather Email.
 * Returns users having valid email addresses without requiring phone_verified or sms_enabled.
 */
export async function getVerifiedEmailRecipientsForAdmin(recipientIdentifiers = []) {
  if (!supabase) {
    throw new Error('Supabase client not initialized.');
  }

  if (!recipientIdentifiers || recipientIdentifiers.length === 0) {
    return [];
  }

  const normalizedEmails = recipientIdentifiers
    .map((e) => (typeof e === 'string' ? e.trim().toLowerCase() : ''))
    .filter(Boolean);

  if (normalizedEmails.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('users')
    .select('name, email, role')
    .in('email', normalizedEmails);

  if (error) {
    console.error('[SupabaseService] Failed to verify email recipients for admin:', error.message);
    throw error;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return (data || []).filter((u) => u.email && emailRegex.test(u.email.trim()));
}

