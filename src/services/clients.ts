import { supabase } from '../lib/supabase';
import { createEmptyClientData, normalizeClientData } from '../features/clients/clientData';
import type { ClientProfile, ClientRecord } from '../types';

const TABLE = 'clients';

const emptyData = createEmptyClientData();

function normalizeClientRow(client: ClientRecord): ClientRecord {
  return {
    ...client,
    data: normalizeClientData(client.data)
  };
}

function mapClientToRow(client: ClientProfile) {
  return {
    company_name: client.companyName,
    contact_name: client.contactName,
    contact_email: client.contactEmail,
    contact_phone: client.contactPhone,
    location: client.location,
    notes: client.notes,
    logo_url: client.logoUrl,
    cover_url: client.coverUrl,
    status: client.status,
    tier: client.tier,
    industry: client.industry,
    website: client.website,
    next_review_date: client.nextReviewDate || null,
    tags: client.tags,
    data: client.data ?? emptyData
  };
}

async function requireUserId(): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) throw new Error('You must be signed in.');

  return userId;
}

export async function listClients(): Promise<ClientRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('company_name', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(normalizeClientRow);
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeClientRow(data) : null;
}

export async function createClient(client: ClientProfile): Promise<ClientRecord> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = await requireUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      ...mapClientToRow(client)
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeClientRow(data);
}

export async function updateClient(id: string, client: ClientProfile): Promise<ClientRecord> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from(TABLE)
    .update(mapClientToRow(client))
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeClientRow(data);
}

export async function deleteClient(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
