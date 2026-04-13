import { supabase } from './supabase-public';

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