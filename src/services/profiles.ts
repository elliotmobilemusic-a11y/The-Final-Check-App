import { supabase } from '../lib/supabase';

export interface UserProfile {
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  avatar_position?: Record<string, number>;
  job_title?: string;
  organisation?: string;
  updated_at: string;
}

const AVATAR_BUCKET = 'avatars';

function isMissingProfilesTable(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === 'PGRST205' || /profiles/i.test(maybeError.message ?? '');
}

function missingProfilesTableError() {
  return new Error(
    'The Supabase `profiles` table is missing on this project. Run the latest supabase/schema.sql in Supabase, then refresh the app.'
  );
}

/**
 * ✅ Safe avatar upload to Supabase Storage
 * Never stores base64 images anywhere - only public URLs
 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  // Safety guard: block base64 / data URI uploads completely
  if (file.type.startsWith('data:image/')) {
    throw new Error('Base64 images are not allowed. Use a File object instead.');
  }

  const extension = file.type.split('/')[1] || 'jpg';
  const version = Date.now();
  const path = `${userId}/avatar-${version}.${extension}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      cacheControl: '31536000',
      upsert: true,
      contentType: file.type
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(path);

  return `${publicUrl}?v=${version}`;
}

/**
 * Save avatar URL to profiles table
 * ✅ Blocks base64 / oversized avatar values completely
 */
export async function saveAvatarUrl(userId: string, url: string): Promise<void> {
  // Safety guard: block invalid avatar values
  if (url.startsWith('data:image/')) {
    throw new Error('Base64 avatar URLs are not permitted. Use storage URL only.');
  }

  if (url.length > 1000) {
    throw new Error('Avatar URL is too long. Invalid value blocked.');
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      avatar_url: url,
      updated_at: new Date().toISOString()
    });

  if (error) {
    if (isMissingProfilesTable(error)) throw missingProfilesTableError();
    throw error;
  }
}

/**
 * Get user profile record
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingProfilesTable(error)) return null;
    throw error;
  }
  return data as UserProfile | null;
}

/**
 * Update user profile
 */
export async function updateProfile(userId: string, profile: Partial<Omit<UserProfile, 'user_id' | 'updated_at'>>): Promise<UserProfile> {
  // Extra safety for avatar field
  if (profile.avatar_url) {
    if (profile.avatar_url.startsWith('data:image/') || profile.avatar_url.length > 1000) {
      throw new Error('Invalid avatar value blocked');
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      ...profile,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    if (isMissingProfilesTable(error)) throw missingProfilesTableError();
    throw error;
  }
  return data as UserProfile;
}
