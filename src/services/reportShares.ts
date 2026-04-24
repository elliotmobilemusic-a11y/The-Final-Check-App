import { supabasePublic } from '../lib/supabase-public';
import type {
  AuditFormState,
  ClientPortalSharePayload,
  FoodSafetyAuditState,
  MenuProjectState,
  MysteryShopAuditState,
  ReportShareRecord
} from '../types';

type ReportShareType =
  | 'generic_report'
  | 'client_portal'
  | 'kitchen_audit'
  | 'food_safety_audit'
  | 'mystery_shop_audit'
  | 'menu_project';

type CreateShareOptions<T> = {
  path: string;
  payload: T;
  reportType: ReportShareType;
  sourceRecordId?: string | null;
  title: string;
};

function createShareToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function buildShareUrl(path: string, token: string) {
  return `${window.location.origin}/#${path}/${token}`;
}

function normalizeShareError(error: unknown): Error {
  if (error instanceof Error && /failed to fetch/i.test(error.message)) {
    return new Error(
      'Supabase could not reach the report sharing service. Run the latest schema.sql in your active Supabase project, then redeploy or refresh the app.'
    );
  }

  return error instanceof Error ? error : new Error('Could not create the share link.');
}

async function createShareRecord<T>({
  path,
  payload,
  reportType,
  sourceRecordId = null,
  title
}: CreateShareOptions<T>): Promise<ReportShareRecord<T> & { url: string }> {
  const { supabase } = await import('../lib/supabase');
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('You must be signed in to create a share link.');
  }

  const body = {
    user_id: user.id,
    report_type: reportType,
    title,
    token: createShareToken(),
    source_record_id: sourceRecordId,
    payload,
    is_public: true
  };

  let data: ReportShareRecord<T> | null = null;

  if (sourceRecordId) {
    const { data: existing, error: existingError } = await supabase
      .from('report_shares')
      .select('*')
      .eq('user_id', user.id)
      .eq('report_type', reportType)
      .eq('source_record_id', sourceRecordId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw normalizeShareError(existingError);

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('report_shares')
        .update({
          title,
          payload,
          is_public: true,
          expires_at: null
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateError) throw normalizeShareError(updateError);
      data = updated as ReportShareRecord<T>;
    }
  }

  if (!data) {
    const { data: inserted, error } = await supabase.from('report_shares').insert(body).select('*').single();
    if (error) throw normalizeShareError(error);
    data = inserted as ReportShareRecord<T>;
  }

  return {
    ...data,
    url: buildShareUrl(path, data.token)
  };
}

async function getPublicShareByToken<T>(
  token: string,
  reportType?: ReportShareType
): Promise<ReportShareRecord<T> | null> {
  let query = supabasePublic.from('report_shares').select('*').eq('token', token);

  if (reportType) {
    query = query.eq('report_type', reportType);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw normalizeShareError(error);

  return (data as ReportShareRecord<T> | null) ?? null;
}

export async function createReportShare(clientId: string | null, reportData: Record<string, unknown>) {
  return createShareRecord({
    path: '/share/report',
    payload: reportData,
    reportType: 'generic_report',
    sourceRecordId: clientId,
    title: 'Shared report'
  });
}

export async function createHtmlReportShare(sourceRecordId: string | null, title: string, html: string) {
  return createShareRecord({
    path: '/share/report',
    payload: {
      title,
      html
    },
    reportType: 'generic_report',
    sourceRecordId,
    title
  });
}

export async function getReportShareByToken(token: string) {
  return getPublicShareByToken<Record<string, unknown>>(token, 'generic_report');
}

export async function createClientPortalShare(clientId: string, payload: ClientPortalSharePayload) {
  return createShareRecord<ClientPortalSharePayload>({
    path: '/portal/client',
    payload,
    reportType: 'client_portal',
    sourceRecordId: clientId,
    title: `${payload.clientName || 'Client'} portal`
  });
}

export async function getClientPortalShareByToken(token: string) {
  return getPublicShareByToken<ClientPortalSharePayload>(token, 'client_portal');
}

export async function createKitchenAuditShare(auditData: AuditFormState) {
  return createShareRecord<AuditFormState>({
    path: '/share/kitchen-audit',
    payload: auditData,
    reportType: 'kitchen_audit',
    sourceRecordId: auditData.id ?? null,
    title: auditData.title?.trim() || 'Kitchen Profit Audit report'
  });
}

export async function getKitchenAuditShareByToken(token: string) {
  return getPublicShareByToken<AuditFormState>(token, 'kitchen_audit');
}

export async function createFoodSafetyShare(auditData: FoodSafetyAuditState) {
  return createShareRecord<FoodSafetyAuditState>({
    path: '/share/food-safety',
    payload: auditData,
    reportType: 'food_safety_audit',
    sourceRecordId: auditData.id ?? null,
    title: auditData.title?.trim() || 'Food Safety Audit report'
  });
}

export async function getFoodSafetyShareByToken(token: string) {
  return getPublicShareByToken<FoodSafetyAuditState>(token, 'food_safety_audit');
}

export async function createMysteryShopShare(auditData: MysteryShopAuditState) {
  return createShareRecord<MysteryShopAuditState>({
    path: '/share/mystery-shop',
    payload: auditData,
    reportType: 'mystery_shop_audit',
    sourceRecordId: auditData.id ?? null,
    title: auditData.title?.trim() || 'Mystery Shop Audit report'
  });
}

export async function getMysteryShopShareByToken(token: string) {
  return getPublicShareByToken<MysteryShopAuditState>(token, 'mystery_shop_audit');
}

export async function createMenuShare(menuData: MenuProjectState) {
  return createShareRecord<MenuProjectState>({
    path: '/share/menu',
    payload: menuData,
    reportType: 'menu_project',
    sourceRecordId: menuData.id ?? null,
    title: menuData.menuName?.trim() || 'Menu Profit Engine report'
  });
}

export async function getMenuShareByToken(token: string) {
  return getPublicShareByToken<MenuProjectState>(token, 'menu_project');
}
