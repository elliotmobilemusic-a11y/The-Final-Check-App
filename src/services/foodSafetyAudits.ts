import { supabase } from '../lib/supabase';
import type { FoodSafetyAuditState } from '../types';
import {
  listLocalToolRecords,
  deleteLocalToolRecord
} from './localToolStore';

const STORAGE_KEY = 'the-final-check-food-safety-audits-v1';

/**
 * Food Safety Audit Storage Service
 *
 * STATUS: SYNCED (Supabase backend)
 * Records are now synced across all devices for the authenticated user.
 * Legacy local records are automatically migrated on first load.
 */

export interface FoodSafetyAuditRecord {
  id: string;
  user_id: string;
  client_id: string | null;
  client_site_id: string | null;
  title: string;
  site_name: string;
  location: string;
  review_date: string | null;
  data: FoodSafetyAuditState;
  created_at: string;
  updated_at: string;
}

export async function listFoodSafetyAudits(): Promise<FoodSafetyAuditRecord[]> {
  // Automatic legacy migration: import any local records that haven't been synced yet
  const localRecords = listLocalToolRecords<FoodSafetyAuditState>(STORAGE_KEY);

  if (localRecords.length > 0 && supabase) {
    for (const record of localRecords) {
      try {
        await saveFoodSafetyAudit({
          id: record.id,
          client_id: record.data.clientId ?? null,
          client_site_id: record.data.clientSiteId ?? null,
          title: record.data.title ?? 'Food Safety Audit',
          site_name: record.data.siteName ?? '',
          location: record.data.location ?? '',
          review_date: record.data.auditDate ?? null,
          data: record.data
        });
        deleteLocalToolRecord(STORAGE_KEY, record.id);
      } catch {
        // Continue with other records if one fails
      }
    }
  }

  if (!supabase) return [];

  const { data, error } = await supabase
    .from('food_safety_audits')
    .select('*')
    .order('review_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listFoodSafetyAuditsForClient(clientId: string): Promise<FoodSafetyAuditRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('food_safety_audits')
    .select('*')
    .eq('client_id', clientId)
    .order('review_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getFoodSafetyAudit(id: string): Promise<FoodSafetyAuditRecord | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('food_safety_audits')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function saveFoodSafetyAudit(
  record: Omit<FoodSafetyAuditRecord, 'user_id' | 'created_at' | 'updated_at'> & Partial<Pick<FoodSafetyAuditRecord, 'created_at' | 'updated_at'>>
): Promise<FoodSafetyAuditRecord> {
  if (!supabase) throw new Error('Not authenticated.');

  const { data, error } = await supabase
    .from('food_safety_audits')
    .upsert(record, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFoodSafetyAudit(id: string): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('food_safety_audits')
    .delete()
    .eq('id', id);
}