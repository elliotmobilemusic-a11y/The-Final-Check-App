import { supabase } from '../lib/supabase';

export async function createReportShare(clientId: string, reportData: any) {
  const token = crypto.randomUUID();
  
  const { data, error } = await supabase
    .from('report_shares')
    .insert({
      token,
      client_id: clientId,
      report_data: reportData,
      expires_at: null,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    token,
    url: `${window.location.origin}/share/report/${token}`
  };
}

export async function getReportShareByToken(token: string) {
  const { data, error } = await supabase
    .from('report_shares')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) return null;
  
  return data.report_data;
}

export async function createKitchenAuditShare(auditData: any) {
  const token = crypto.randomUUID();
  
  const { data, error } = await supabase
    .from('report_shares')
    .insert({
      token,
      client_id: null,
      report_data: auditData,
      expires_at: null,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    token,
    url: `${window.location.origin}/share/audit/${token}`
  };
}

export async function getKitchenAuditShareByToken(token: string) {
  const { data, error } = await supabase
    .from('report_shares')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) return null;
  
  return data.report_data;
}

export async function createFoodSafetyShare(auditData: any) {
  const token = crypto.randomUUID();
  
  const { data, error } = await supabase
    .from('report_shares')
    .insert({
      token,
      client_id: null,
      report_data: auditData,
      expires_at: null,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    token,
    url: `${window.location.origin}/share/food-safety/${token}`
  };
}

export async function getFoodSafetyShareByToken(token: string) {
  const { data, error } = await supabase
    .from('report_shares')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) return null;
  
  return data.report_data;
}

export async function createMysteryShopShare(auditData: any) {
  const token = crypto.randomUUID();
  
  const { data, error } = await supabase
    .from('report_shares')
    .insert({
      token,
      client_id: null,
      report_data: auditData,
      expires_at: null,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    token,
    url: `${window.location.origin}/share/mystery-shop/${token}`
  };
}

export async function getMysteryShopShareByToken(token: string) {
  const { data, error } = await supabase
    .from('report_shares')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) return null;
  
  return data.report_data;
}

export async function createMenuShare(menuData: any) {
  const token = crypto.randomUUID();
  
  const { data, error } = await supabase
    .from('report_shares')
    .insert({
      token,
      client_id: null,
      report_data: menuData,
      expires_at: null,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  
  return {
    token,
    url: `${window.location.origin}/share/menu/${token}`
  };
}

export async function getMenuShareByToken(token: string) {
  const { data, error } = await supabase
    .from('report_shares')
    .select('*')
    .eq('token', token)
    .single();

  if (error || !data) return null;
  
  return data.report_data;
}
