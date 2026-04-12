import { createClient } from '@supabase/supabase-js';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function createEmptyClientData() {
  return {
    profileSummary: '',
    goals: [],
    risks: [],
    opportunities: [],
    internalNotes: '',
    contacts: [],
    sites: [],
    timeline: [],
    tasks: [],
    accountOwner: '',
    leadSource: '',
    accountScope: 'Single site',
    operatingCountry: 'United Kingdom',
    relationshipHealth: 'Strong',
    estimatedMonthlyValue: 0,
    siteCountEstimate: 1,
    registeredName: '',
    registeredAddress: '',
    billingName: '',
    billingEmail: '',
    billingAddress: '',
    paymentTermsDays: 30,
    vatNumber: '',
    companyNumber: '',
    deals: [],
    invoices: []
  };
}

function normalizeWebsite(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function stripCodeFence(text) {
  return String(text ?? '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function parseJsonPayload(text) {
  const clean = stripCodeFence(text);

  try {
    return JSON.parse(clean);
  } catch {
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Could not parse Gemini client enrichment payload.');
  }
}

async function enrichClientWithGemini(form, apiKey) {
  if (!apiKey) return null;

  const prompt = [
    'You are enriching a hospitality consultancy CRM client record.',
    'Return only JSON with shape:',
    '{"profileSummary":"","industry":"","tags":[],"goals":[],"risks":[],"opportunities":[],"accountScope":"Single site|Multi-site group|Group / head office"}',
    'Keep all output concise and commercially useful.',
    'Infer likely hospitality type, account scope, top opportunities, main risks, and a short professional summary.',
    `Business name: ${form.businessName}`,
    `Trading name: ${form.tradingName}`,
    `Website: ${form.website}`,
    `Address: ${form.address}`,
    `Postcode: ${form.postcode}`,
    `Business type: ${form.businessType}`,
    `Site count: ${form.siteCount}`,
    `Weekly sales band: ${form.weeklySalesBand}`,
    `Challenges: ${form.challenges}`,
    `Support needed: ${form.supportNeeded}`,
    `Extra notes: ${form.extraNotes}`
  ].join('\n');

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) return null;

  const json = await response.json();
  const text =
    json?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('\n').trim() || '';

  try {
    return parseJsonPayload(text);
  } catch {
    return null;
  }
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials are not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function mapSubmissionToClient(form, sharePayload, enrichment) {
  const emptyData = createEmptyClientData();
  const businessName = String(form.businessName ?? '').trim();
  const tradingName = String(form.tradingName ?? '').trim();
  const website = normalizeWebsite(String(form.website ?? '').trim());
  const contactEmail = String(form.contactEmail ?? '').trim();
  const contactName = String(form.contactName ?? '').trim();
  const contactPhone = String(form.contactPhone ?? '').trim();
  const location = [String(form.address ?? '').trim(), String(form.postcode ?? '').trim()]
    .filter(Boolean)
    .join(', ');
  const siteCount = Math.max(1, Number(form.siteCount ?? 1) || 1);
  const tags = [
    String(form.businessType ?? '').trim(),
    ...(Array.isArray(enrichment?.tags) ? enrichment.tags.map((item) => String(item).trim()) : [])
  ].filter(Boolean);

  return {
    company_name: businessName,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    location,
    notes: String(form.extraNotes ?? '').trim(),
    logo_url: '',
    cover_url: '',
    status: 'Prospect',
    tier: String(sharePayload?.presetTier ?? 'Standard'),
    industry: String(enrichment?.industry ?? form.businessType ?? '').trim(),
    website,
    next_review_date: null,
    tags: [...new Set(tags)],
    data: {
      ...emptyData,
      profileSummary: String(enrichment?.profileSummary ?? '').trim(),
      goals: Array.isArray(enrichment?.goals) ? enrichment.goals.map((item) => String(item)) : [],
      risks: Array.isArray(enrichment?.risks) ? enrichment.risks.map((item) => String(item)) : [],
      opportunities: Array.isArray(enrichment?.opportunities)
        ? enrichment.opportunities.map((item) => String(item))
        : [],
      internalNotes: [
        `Client intake submitted by ${contactName || 'prospect'}.`,
        form.challenges ? `Current challenges: ${form.challenges}` : '',
        form.supportNeeded ? `Support requested: ${form.supportNeeded}` : '',
        form.weeklySalesBand ? `Weekly sales band: ${form.weeklySalesBand}` : ''
      ]
        .filter(Boolean)
        .join('\n'),
      accountOwner: String(sharePayload?.presetAccountOwner ?? '').trim(),
      leadSource: String(sharePayload?.presetLeadSource ?? 'Client intake form').trim(),
      accountScope:
        enrichment?.accountScope === 'Group / head office' || siteCount > 5
          ? 'Group / head office'
          : enrichment?.accountScope === 'Multi-site group' || siteCount > 1
            ? 'Multi-site group'
            : 'Single site',
      operatingCountry: 'United Kingdom',
      siteCountEstimate: siteCount,
      registeredName: businessName,
      registeredAddress: String(form.address ?? '').trim(),
      billingName: businessName,
      billingEmail: contactEmail,
      billingAddress: String(form.address ?? '').trim(),
      contacts: contactName || contactEmail || contactPhone
        ? [
            {
              id: 'primary-contact',
              name: contactName,
              role: 'Primary contact',
              email: contactEmail,
              phone: contactPhone,
              isPrimary: true,
              notes: ''
            }
          ]
        : [],
      sites:
        siteCount > 0
          ? [
              {
                id: 'primary-site',
                name: tradingName || businessName,
                address: String(form.address ?? '').trim(),
                website,
                status: 'Active',
                notes: 'Submitted through client intake form.'
              }
            ]
          : []
    }
  };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const token = String(body?.token ?? '').trim();
    const form = body?.form ?? {};

    if (!token) {
      response.status(400).json({ error: 'Missing intake token.' });
      return;
    }

    const supabase = createSupabaseAdminClient();
    const { data: share, error: shareError } = await supabase
      .from('report_shares')
      .select('*')
      .eq('report_type', 'client_intake')
      .eq('token', token)
      .eq('is_public', true)
      .maybeSingle();

    if (shareError) throw shareError;
    if (!share) {
      response.status(404).json({ error: 'This intake link is no longer available.' });
      return;
    }

    const enrichment = await enrichClientWithGemini(form, process.env.GEMINI_API_KEY).catch(() => null);
    const clientRow = mapSubmissionToClient(form, share.payload, enrichment);

    const { data: createdClient, error: createError } = await supabase
      .from('clients')
      .insert({
        user_id: share.user_id,
        ...clientRow
      })
      .select('id, company_name')
      .single();

    if (createError) throw createError;

    await supabase
      .from('report_shares')
      .update({
        is_public: false,
        source_record_id: createdClient.id,
        payload: {
          ...(share.payload ?? {}),
          submission: form,
          submitted_at: new Date().toISOString()
        }
      })
      .eq('id', share.id);

    response.status(200).json({
      ok: true,
      clientId: createdClient.id,
      companyName: createdClient.company_name
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Could not submit intake form.'
    });
  }
}
