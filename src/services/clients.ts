import { supabase } from '../lib/supabase';
import { createEmptyClientData, normalizeClientData } from '../features/clients/clientData';
import type { ClientProfile, ClientRecord } from '../types';
import { normalizeServiceError, requireSignedInUserId } from './serviceUtils';

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

export async function listClients(): Promise<ClientRecord[]> {
  if (!supabase) return [];

  const userId = await requireSignedInUserId();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('company_name', { ascending: true });

  if (error) throw normalizeServiceError(error, 'Could not load clients.');
  return (data ?? []).map(normalizeClientRow);
}

export async function getClientById(id: string): Promise<ClientRecord | null> {
  if (!supabase) return null;

  const userId = await requireSignedInUserId();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw normalizeServiceError(error, 'Could not load this client.');
  return data ? normalizeClientRow(data) : null;
}

export async function createClient(client: ClientProfile): Promise<ClientRecord> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = await requireSignedInUserId();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      ...mapClientToRow(client)
    })
    .select('*')
    .single();

  if (error) throw normalizeServiceError(error, 'Could not create the client.');
  return normalizeClientRow(data);
}

export async function updateClient(id: string, client: ClientProfile): Promise<ClientRecord> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = await requireSignedInUserId();
  const { data, error } = await supabase
    .from(TABLE)
    .update(mapClientToRow(client))
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw normalizeServiceError(error, 'Could not update the client.');
  return normalizeClientRow(data);
}

export async function deleteClient(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = await requireSignedInUserId();
  const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('user_id', userId);
  if (error) throw normalizeServiceError(error, 'Could not delete the client.');
}
