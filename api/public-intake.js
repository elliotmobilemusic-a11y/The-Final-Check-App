import { createClient } from '@supabase/supabase-js';
import { sendPushNotificationToUser } from './_push.js';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const ALLOWED_ORIGINS = [
  'https://www.thefinalcheck.uk',
  'https://thefinalcheck.uk',
  'https://portal.thefinalcheck.uk',
  'http://localhost:5173',
  'http://localhost:3000'
];

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
    throw new Error('Could not parse Gemini enrichment payload.');
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
    `Website: ${form.website}`,
    `Head office address: ${form.headOfficeAddress}`,
    `Business type: ${form.businessType}`,
    `Site count: ${Array.isArray(form.sites) ? form.sites.length : 0}`,
    `Sites: ${JSON.stringify(form.sites ?? [])}`,
    `Weekly sales band: ${form.weeklySalesBand}`,
    `Challenges: ${form.challenges}`,
    `Support needed: ${form.supportNeeded}`,
    `Extra notes: ${form.extraNotes}`
  ].join('\n');

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!response.ok) return null;

  const json = await response.json();
  const text =
    json?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('\n').trim() || '';

  try {
    return parseJsonPayload(text);
  } catch {
    return null;
  }
}

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

function mapFormToClient(form, enrichment) {
  const emptyData = createEmptyClientData();
  const businessName = String(form.businessName ?? '').trim();
  const website = normalizeWebsite(String(form.website ?? '').trim());
  const contactEmail = String(form.contactEmail ?? '').trim();
  const contactName = String(form.contactName ?? '').trim();
  const contactRole = String(form.contactRole ?? '').trim();
  const contactPhone = String(form.contactPhone ?? '').trim();
  const preferredContactMethod = String(form.preferredContactMethod ?? '').trim();
  const headOfficeAddress = String(form.headOfficeAddress ?? '').trim();

  const submittedSites = Array.isArray(form.sites) ? form.sites : [];
  const cleanSites = submittedSites
    .map((site, index) => ({
      id: `site-${index + 1}`,
      name: String(site?.name ?? '').trim(),
      address: String(site?.address ?? '').trim(),
      website: normalizeWebsite(String(site?.website ?? '').trim()),
      status: String(site?.status ?? '').trim() === 'Inactive' ? 'Inactive' : 'Active'
    }))
    .filter((site) => site.name || site.address || site.website);

  const primarySite = cleanSites[0] ?? null;
  const location = primarySite?.address || headOfficeAddress;
  const siteCount = Math.max(cleanSites.length, 1);

  const tags = [
    String(form.businessType ?? '').trim(),
    ...(Array.isArray(enrichment?.tags) ? enrichment.tags.map((t) => String(t).trim()) : [])
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
    tier: 'Standard',
    industry: String(enrichment?.industry ?? form.businessType ?? '').trim(),
    website,
    next_review_date: null,
    tags: [...new Set(tags)],
    data: {
      ...emptyData,
      profileSummary: String(enrichment?.profileSummary ?? '').trim(),
      goals: Array.isArray(enrichment?.goals) ? enrichment.goals.map(String) : [],
      risks: Array.isArray(enrichment?.risks) ? enrichment.risks.map(String) : [],
      opportunities: Array.isArray(enrichment?.opportunities)
        ? enrichment.opportunities.map(String)
        : [],
      internalNotes: [
        `Client enquiry submitted by ${contactName || 'prospect'}.`,
        contactRole ? `Contact role: ${contactRole}` : '',
        preferredContactMethod ? `Preferred contact method: ${preferredContactMethod}` : '',
        form.challenges ? `Current challenges: ${form.challenges}` : '',
        form.supportNeeded ? `Support requested: ${form.supportNeeded}` : '',
        form.weeklySalesBand ? `Weekly sales band: ${form.weeklySalesBand}` : '',
        headOfficeAddress ? `Head office address: ${headOfficeAddress}` : ''
      ]
        .filter(Boolean)
        .join('\n'),
      leadSource: 'Website enquiry form',
      accountScope:
        siteCount > 5
          ? 'Group / head office'
          : siteCount > 1
            ? 'Multi-site group'
            : (enrichment?.accountScope ?? 'Single site'),
      operatingCountry: 'United Kingdom',
      siteCountEstimate: siteCount,
      registeredName: businessName,
      registeredAddress: headOfficeAddress,
      billingName: businessName,
      billingEmail: contactEmail,
      billingAddress: headOfficeAddress,
      contacts:
        contactName || contactEmail || contactPhone
          ? [
              {
                id: 'primary-contact',
                name: contactName,
                role: contactRole || 'Primary contact',
                email: contactEmail,
                phone: contactPhone,
                isPrimary: true,
                notes: preferredContactMethod
                  ? `Preferred contact method: ${preferredContactMethod}`
                  : ''
              }
            ]
          : [],
      sites: cleanSites.length
        ? cleanSites.map((site) => ({
            id: site.id,
            name: site.name || businessName,
            address: site.address,
            website: site.website || website,
            status: site.status,
            notes: 'Submitted through website enquiry form.'
          }))
        : [
            {
              id: 'primary-site',
              name: businessName,
              address: headOfficeAddress,
              website,
              status: 'Active',
              notes: 'Submitted through website enquiry form.'
            }
          ]
    }
  };
}

export default async function handler(request, response) {
  const origin = request.headers.origin || request.headers.Origin;
  response.setHeader(
    'Access-Control-Allow-Origin',
    ALLOWED_ORIGINS.includes(origin) ? origin : '*'
  );
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Vary', 'Origin');

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
    const form = body?.form ?? {};

    const ownerUserId = process.env.PUBLIC_INTAKE_USER_ID;
    if (!ownerUserId) {
      response.status(500).json({ error: 'Portal intake owner is not configured.' });
      return;
    }

    if (!String(form.businessName ?? '').trim()) {
      response.status(400).json({ error: 'Business name is required.' });
      return;
    }

    const supabase = createSupabaseAdminClient();
    const enrichment = await enrichClientWithGemini(form, process.env.GEMINI_API_KEY).catch(
      () => null
    );
    const clientRow = mapFormToClient(form, enrichment);

    const { data: createdClient, error: createError } = await supabase
      .from('clients')
      .insert({ user_id: ownerUserId, ...clientRow })
      .select('id, company_name')
      .single();

    if (createError) throw createError;

    await sendPushNotificationToUser(ownerUserId, {
      title: 'New client enquiry',
      body: `${createdClient.company_name} has submitted a new enquiry form.`,
      tag: `client-enquiry:${createdClient.id}`,
      url: '/#/clients?status=Prospect',
      icon: '/the-final-check-logo.png',
      badge: '/the-final-check-favicon.png'
    }).catch(() => {});

    response.status(200).json({
      ok: true,
      clientId: createdClient.id,
      companyName: createdClient.company_name
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Could not submit enquiry.'
    });
  }
}
