import { createClient } from '@supabase/supabase-js';
import { sendPushNotificationToUser } from './_push.js';

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fallbackAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error('Supabase URL is not configured.');
  const apiKey = serviceRoleKey || fallbackAnonKey;
  if (!apiKey) throw new Error('Supabase API key is not configured.');

  return createClient(supabaseUrl, apiKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const token = String(body?.token ?? '').trim();
    const answers = body?.answers ?? {};

    if (!token) {
      response.status(400).json({ error: 'Missing questionnaire token.' });
      return;
    }

    if (!answers || typeof answers !== 'object') {
      response.status(400).json({ error: 'Missing answers payload.' });
      return;
    }

    const supabase = createSupabaseAdminClient();

    // Validate the share token
    const { data: share, error: shareError } = await supabase
      .from('report_shares')
      .select('*')
      .eq('report_type', 'pre_visit_questionnaire')
      .eq('token', token)
      .eq('is_public', true)
      .maybeSingle();

    if (shareError) throw shareError;
    if (!share) {
      response.status(404).json({ error: 'This questionnaire link is no longer available.' });
      return;
    }

    const payload = share.payload ?? {};
    const templateId = String(payload.templateId ?? '').trim();
    const clientId = payload.clientId ?? null;

    if (!templateId) {
      response.status(400).json({ error: 'Questionnaire template not configured.' });
      return;
    }

    // Create the submission record
    const { data: submission, error: submitError } = await supabase
      .from('questionnaire_submissions')
      .insert({
        user_id: share.user_id,
        share_id: share.id,
        template_id: templateId,
        client_id: clientId,
        answers,
        status: 'pending',
        submitted_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (submitError) throw submitError;

    // Deactivate the share so it can't be resubmitted
    await supabase
      .from('report_shares')
      .update({
        is_public: false,
        payload: {
          ...payload,
          submitted_at: new Date().toISOString(),
          submission_id: submission.id
        }
      })
      .eq('id', share.id);

    // Notify the user
    const contactName = String(answers.contactName ?? answers.businessName ?? 'Client').trim();
    const businessName = String(answers.businessName ?? '').trim();
    const notifTitle = templateId === 'profit_audit' ? 'Pre-Visit Questionnaire Received' : 'Questionnaire Received';
    const notifBody = businessName
      ? `${businessName} has completed the pre-visit questionnaire.`
      : `${contactName} has completed the pre-visit questionnaire.`;

    await sendPushNotificationToUser(share.user_id, {
      title: notifTitle,
      body: notifBody,
      tag: `questionnaire:${submission.id}`,
      url: `/#/questionnaires/${submission.id}`,
      icon: '/the-final-check-logo.png',
      badge: '/the-final-check-favicon.png'
    }).catch(() => {});

    response.status(200).json({ ok: true, submissionId: submission.id });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Could not submit questionnaire.'
    });
  }
}
