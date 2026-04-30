import { supabase } from '../lib/supabase';
import type { MysteryShopAuditState } from '../types';
import {
  listLocalToolRecords,
  deleteLocalToolRecord
} from './localToolStore';

const STORAGE_KEY = 'the-final-check-mystery-shop-audits-v1';

/**
 * Mystery Shop Audit Storage Service
 *
 * STATUS: SYNCED (Supabase backend)
 * Records are now synced across all devices for the authenticated user.
 * Legacy local records are automatically migrated on first load.
 */

export interface MysteryShopAuditRecord {
  id: string;
  user_id: string;
  client_id: string | null;
  client_site_id: string | null;
  title: string;
  site_name: string;
  location: string;
  review_date: string | null;
  data: MysteryShopAuditState;
  created_at: string;
  updated_at: string;
}

export async function listMysteryShopAudits(): Promise<MysteryShopAuditRecord[]> {
  // Automatic legacy migration: import any local records that haven't been synced yet
  const localRecords = listLocalToolRecords<MysteryShopAuditState>(STORAGE_KEY);

  if (localRecords.length > 0 && supabase) {
    for (const record of localRecords) {
      try {
        await saveMysteryShopAudit({
          id: record.id,
          client_id: record.data.clientId ?? null,
          client_site_id: record.data.clientSiteId ?? null,
          title: record.data.title ?? 'Mystery Shop Audit',
          site_name: record.data.siteName ?? '',
          location: record.data.location ?? '',
          review_date: record.data.visitDate ?? null,
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
    .from('mystery_shop_audits')
    .select('*')
    .order('review_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listMysteryShopAuditsForClient(clientId: string): Promise<MysteryShopAuditRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('mystery_shop_audits')
    .select('*')
    .eq('client_id', clientId)
    .order('review_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMysteryShopAudit(id: string): Promise<MysteryShopAuditRecord | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('mystery_shop_audits')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function saveMysteryShopAudit(
  record: Omit<MysteryShopAuditRecord, 'user_id' | 'created_at' | 'updated_at'> & Partial<Pick<MysteryShopAuditRecord, 'created_at' | 'updated_at'>>
): Promise<MysteryShopAuditRecord> {
  if (!supabase) throw new Error('Not authenticated.');

  const { data, error } = await supabase
    .from('mystery_shop_audits')
    .upsert(record, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMysteryShopAudit(id: string): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('mystery_shop_audits')
    .delete()
    .eq('id', id);
}