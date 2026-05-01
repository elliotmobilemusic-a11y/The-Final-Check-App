import { supabasePublic } from '../lib/supabase-public';
import { getQuestionnaireTemplate } from '../features/questionnaires/questionnaireTemplates';
import type {
  QuestionnaireSharePayload,
  QuestionnaireSubmissionRecord,
  QuestionnaireSubmissionStatus,
  ReportShareRecord
} from '../types';

const SHARES_TABLE = 'report_shares';
const SUBMISSIONS_TABLE = 'questionnaire_submissions';
const REPORT_TYPE = 'pre_visit_questionnaire';

function createShareToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error && /failed to fetch/i.test(error.message)) {
    return new Error('Could not reach the questionnaire service. Check your connection and try again.');
  }
  return error instanceof Error ? error : new Error('Questionnaire service error.');
}

// ─── Public (anon) ────────────────────────────────────────────────────────────

export async function getQuestionnaireShareByToken(
  token: string
): Promise<ReportShareRecord<QuestionnaireSharePayload> | null> {
  const { data, error } = await supabasePublic
    .from(SHARES_TABLE)
    .select('*')
    .eq('report_type', REPORT_TYPE)
    .eq('token', token)
    .eq('is_public', true)
    .maybeSingle();

  if (error) throw normalizeError(error);
  return (data as ReportShareRecord<QuestionnaireSharePayload> | null) ?? null;
}

// ─── Authenticated ────────────────────────────────────────────────────────────

export async function createQuestionnaireShare(
  payload: QuestionnaireSharePayload
): Promise<ReportShareRecord<QuestionnaireSharePayload>> {
  const { supabase } = await import('../lib/supabase');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be signed in.');

  const template = getQuestionnaireTemplate(payload.templateId);
  const title = template
    ? `${template.label}${payload.clientName ? ` — ${payload.clientName}` : ''}`
    : 'Pre-visit questionnaire';

  const body = {
    user_id: user.id,
    report_type: REPORT_TYPE,
    title,
    token: createShareToken(),
    source_record_id: payload.clientId ?? null,
    payload,
    is_public: true
  };

  const { data, error } = await supabase.from(SHARES_TABLE).insert(body).select('*').single();
  if (error) throw normalizeError(error);

  return data as ReportShareRecord<QuestionnaireSharePayload>;
}

export async function listQuestionnaireSubmissions(): Promise<QuestionnaireSubmissionRecord[]> {
  const { supabase } = await import('../lib/supabase');
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) throw normalizeError(error);
  return (data ?? []) as QuestionnaireSubmissionRecord[];
}

export async function getQuestionnaireSubmission(
  id: string
): Promise<QuestionnaireSubmissionRecord | null> {
  const { supabase } = await import('../lib/supabase');
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw normalizeError(error);
  return (data as QuestionnaireSubmissionRecord | null) ?? null;
}

export async function updateSubmissionStatus(
  id: string,
  status: QuestionnaireSubmissionStatus
): Promise<void> {
  const { supabase } = await import('../lib/supabase');
  const { error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw normalizeError(error);
}
