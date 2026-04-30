import { supabase } from '../lib/supabase';
import type { MysteryShopAuditState } from '../types';
import {
  listLocalToolRecords,
  deleteLocalToolRecord,
  getMigratedIds,
  addMigratedId
} from './localToolStore';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(value: string | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

const STORAGE_KEY = 'the-final-check-mystery-shop-audits-v1';
const MIGRATION_MARKER_KEY = `${STORAGE_KEY}-migrated`;

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
    const migratedIds = getMigratedIds(MIGRATION_MARKER_KEY);
    for (const record of localRecords) {
      if (migratedIds.has(record.id)) {
        // Insert already succeeded in a previous run but the local delete was missed.
        deleteLocalToolRecord(STORAGE_KEY, record.id);
        continue;
      }
      try {
        // Local IDs use uid() prefix format (e.g. "mystery-shop-xxx") which are not valid
        // UUIDs — omit the id so Supabase generates a proper UUID on insert.
        await saveMysteryShopAudit({
          client_id: record.data.clientId ?? null,
          client_site_id: record.data.clientSiteId ?? null,
          title: record.data.title ?? 'Mystery Shop Audit',
          site_name: record.data.siteName ?? '',
          location: record.data.location ?? '',
          review_date: record.data.visitDate ?? null,
          data: record.data
        });
        // Write marker BEFORE deleting so a mid-step crash can't cause a re-import.
        addMigratedId(MIGRATION_MARKER_KEY, record.id);
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
  record: Omit<MysteryShopAuditRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string } & Partial<Pick<MysteryShopAuditRecord, 'created_at' | 'updated_at'>>
): Promise<MysteryShopAuditRecord> {
  if (!supabase) throw new Error('Not authenticated.');

  // Strip non-UUID ids (e.g. legacy prefixed ids like "mystery-shop-xxx") so Supabase
  // generates a valid UUID on insert rather than rejecting with a parse error.
  const payload = isValidUUID(record.id) ? record : { ...record, id: undefined };

  const { data, error } = await supabase
    .from('mystery_shop_audits')
    .upsert(payload, { onConflict: 'id' })
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